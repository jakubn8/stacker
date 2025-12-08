import { NextRequest, NextResponse } from "next/server";
import { whopsdk, STACKER_COMPANY_ID } from "@/lib/whop-sdk";
import {
  getUserByWhopCompanyId,
  createTransaction,
  transactionExists,
  updateUserPaymentMethod,
  isStackerUpsell,
  getStackerProduct,
  updateInvoiceStatus,
  getInvoiceByWhopPaymentId,
  markTransactionsAsInvoiced,
  updateUserNextBillingDate,
  updateBillingStatus,
  incrementTotalRevenue,
  canRunUpsellFlow,
  recordUpsellConversion,
  hasNotificationBeenSent,
  recordSentNotification,
} from "@/lib/db";
import { Timestamp } from "firebase-admin/firestore";
import { generateOfferToken } from "@/lib/offer-tokens";

// Disable body parsing - we need raw body for signature verification
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get raw body for signature verification
    const requestBodyText = await request.text();
    const headers = Object.fromEntries(request.headers);

    // Verify and unwrap the webhook
    let webhookData;
    try {
      webhookData = whopsdk.webhooks.unwrap(requestBodyText, { headers });
    } catch (error) {
      console.error("Webhook verification failed:", error);
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    console.log("Received webhook:", webhookData.type);

    // Handle different webhook types
    switch (webhookData.type) {
      case "payment.succeeded":
        await handlePaymentSucceeded(webhookData.data as unknown as Record<string, unknown>);
        break;

      case "payment.failed":
        await handlePaymentFailed(webhookData.data as unknown as Record<string, unknown>);
        break;

      case "setup_intent.succeeded":
        await handleSetupIntentSucceeded(webhookData.data as unknown as Record<string, unknown>);
        break;

      case "membership.activated":
        await handleMembershipActivated(webhookData.data as unknown as Record<string, unknown>);
        break;

      default:
        console.log("Unhandled webhook type:", webhookData.type);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle successful payments
 * - Track ALL sales from Stacker-enabled companies (for 5% fee)
 * - If it's our Stacker billing charge that succeeded, mark invoice as paid
 */
async function handlePaymentSucceeded(data: Record<string, unknown>): Promise<void> {
  // Log full payload to debug field names
  console.log("Payment succeeded full payload:", JSON.stringify(data, null, 2));

  // Handle nested objects - Whop may send product.id instead of product_id
  const product = data.product as { id?: string } | undefined;
  const company = data.company as { id?: string } | undefined;

  const paymentId = (data.id as string) || "";
  const companyId = (data.company_id as string) || company?.id || "";
  const productId = (data.product_id as string) || product?.id || "";
  const amount = (data.total as number) || 0; // Amount in cents
  const currency = (data.currency as string) || "usd";

  console.log("Payment succeeded parsed:", { paymentId, companyId, productId, amount });

  // Validate required fields
  if (!paymentId || !companyId) {
    console.error("Missing required fields in payment webhook:", { paymentId, companyId });
    return;
  }

  // Check if this is our Stacker billing charge (paid to us)
  if (companyId === STACKER_COMPANY_ID) {
    // This is a billing payment TO us
    // Find the invoice by the stored whopPaymentId
    const invoice = await getInvoiceByWhopPaymentId(paymentId);

    if (invoice && invoice.status === "processing") {
      // Mark invoice as paid
      await updateInvoiceStatus(invoice.id, "paid", {
        paidAt: Timestamp.now(),
      });

      // Mark all transactions as invoiced
      await markTransactionsAsInvoiced(invoice.transactionIds, invoice.id);

      // Update user's next billing date
      const sevenDaysFromNow = Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );
      await updateUserNextBillingDate(invoice.userId, sevenDaysFromNow);

      // Restore user to active status (in case they were in lockout)
      await updateBillingStatus(invoice.userId, "active");

      console.log("Invoice marked as paid:", invoice.id);
    }
    return;
  }

  // Check if we've already processed this payment (idempotency)
  const exists = await transactionExists(paymentId);
  if (exists) {
    console.log("Payment already processed:", paymentId);
    return;
  }

  // Check if this company belongs to a Stacker user
  // If yes, we track ALL their sales for our 5% fee
  const user = await getUserByWhopCompanyId(companyId);
  if (!user) {
    console.log("Company not registered with Stacker, skipping:", companyId);
    return;
  }

  // Get product name - first try our DB, then fall back to Whop API
  let productName = "Product";
  const stackerProduct = await getStackerProduct(productId);
  if (stackerProduct) {
    productName = stackerProduct.name;
  } else {
    // Try to get product name from Whop
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const whopProduct = await (whopsdk.products as any).retrieve({ id: productId });
      productName = whopProduct?.title || "Product";
    } catch (err) {
      console.log("Could not fetch product name from Whop:", err);
    }
  }

  // Create transaction record for this sale
  const transaction = await createTransaction({
    userId: user.id,
    whopPaymentId: paymentId,
    productId,
    productName,
    saleAmount: amount / 100, // Convert cents to dollars
    currency,
  });

  // Increment total revenue for this user (amount is already in cents)
  await incrementTotalRevenue(user.id, amount);

  // Check if this was an upsell/downsell for conversion tracking
  const isUpsell = await isStackerUpsell(productId);
  if (isUpsell) {
    await recordUpsellConversion(user.id, amount);
  }

  console.log("Transaction recorded:", transaction.id, "Fee:", transaction.feeAmount, "Revenue added:", amount, "cents", isUpsell ? "(upsell)" : "(storefront)");
}

/**
 * Handle failed payments
 * - If it's our Stacker billing charge that failed, mark invoice as failed
 */
async function handlePaymentFailed(data: Record<string, unknown>): Promise<void> {
  const paymentId = data.id as string;
  const companyId = data.company_id as string;
  const failureMessage = (data.failure_message as string) || "Unknown error";

  console.log("Payment failed:", { paymentId, companyId, failureMessage });

  // Only handle if this is our Stacker billing charge
  if (companyId !== STACKER_COMPANY_ID) {
    return;
  }

  // Find the invoice by the stored whopPaymentId
  const invoice = await getInvoiceByWhopPaymentId(paymentId);

  if (invoice && invoice.status === "processing") {
    await updateInvoiceStatus(invoice.id, "failed", {
      failureReason: failureMessage,
    });
    console.log("Invoice marked as failed:", invoice.id, failureMessage);
  }
}

/**
 * Handle successful setup intent (payment method vaulted)
 */
async function handleSetupIntentSucceeded(data: Record<string, unknown>): Promise<void> {
  // Log full data structure to debug
  console.log("Setup intent data:", JSON.stringify(data, null, 2));

  // Extract payment method - it's an object with .id inside
  const paymentMethodObj = data.payment_method as { id?: string; card?: { brand?: string; last4?: string } } | undefined;
  const paymentMethodId = paymentMethodObj?.id;
  const metadata = data.metadata as Record<string, string> | undefined;
  const userId = metadata?.stacker_user_id;

  console.log("Setup intent succeeded:", { paymentMethodId, userId, card: paymentMethodObj?.card });

  if (!userId) {
    console.log("No user ID in setup intent metadata");
    return;
  }

  if (!paymentMethodId) {
    console.log("No payment method ID in setup intent data");
    return;
  }

  // Update user with payment method
  await updateUserPaymentMethod(userId, paymentMethodId);
  console.log("Payment method saved for user:", userId);
}

/**
 * Handle membership.activated - when a user gains access to a product
 * This is where we check if the product is a trigger product and send the upsell notification
 */
async function handleMembershipActivated(data: Record<string, unknown>): Promise<void> {
  // Log full payload to debug field names
  console.log("Membership activated full payload:", JSON.stringify(data, null, 2));

  // Handle nested objects - Whop may send product.id instead of product_id
  const product = data.product as { id?: string } | undefined;
  const company = data.company as { id?: string } | undefined;
  const user = data.user as { id?: string; email?: string } | undefined;

  const membershipId = (data.id as string) || "";
  const productId = (data.product_id as string) || product?.id || "";
  const companyId = (data.company_id as string) || company?.id || "";
  const visitorId = (data.user_id as string) || user?.id || "";
  const userEmail = (data.email as string) || user?.email || null;
  // member_id is needed for one-click payments
  const memberId = (data.member_id as string) || membershipId;

  console.log("Membership activated parsed:", { membershipId, memberId, productId, companyId, visitorId });

  // Validate required fields
  if (!companyId || !productId || !visitorId) {
    console.error("Missing required fields in membership webhook:", { companyId, productId, visitorId });
    return;
  }

  // Skip if this is our Stacker company
  if (companyId === STACKER_COMPANY_ID) {
    return;
  }

  // Get the community owner
  const owner = await getUserByWhopCompanyId(companyId);
  if (!owner) {
    console.log("Owner not found for company:", companyId);
    return;
  }

  // Check if upsell flow can run
  const flowCheck = await canRunUpsellFlow(owner.id);
  if (!flowCheck.allowed) {
    console.log("Upsell flow not available:", flowCheck.reason);
    return;
  }

  // Check if this is the trigger product
  if (owner.flowConfig.triggerProductId !== productId) {
    console.log("Not the trigger product, skipping");
    return;
  }

  // Check if notifications are enabled
  const notificationSettings = owner.notificationSettings || {
    title: "🎁 Wait! Your order isn't complete...",
    content: "You unlocked an exclusive offer! Tap to claim it now.",
    enabled: true,
  };

  if (!notificationSettings.enabled) {
    console.log("Notifications disabled for this owner, skipping");
    return;
  }

  // Check if we've already sent a notification to this user for this trigger
  const alreadySent = await hasNotificationBeenSent(owner.id, visitorId, productId);
  if (alreadySent) {
    console.log("Notification already sent to user for this trigger, skipping:", visitorId);
    return;
  }

  // Generate the offer token for the deep link (includes member_id for one-click payments)
  const token = generateOfferToken({
    buyerUserId: visitorId,
    buyerEmail: userEmail,
    buyerMemberId: memberId,
    companyId: companyId,
    triggerProductId: productId,
  });

  // Send push notification via Whop API
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (whopsdk.notifications as any).create({
      user_ids: [visitorId],
      title: notificationSettings.title,
      content: notificationSettings.content,
      // Deep link to the offer page - this opens inside the Whop app
      rest_path: `/experience/offer?token=${encodeURIComponent(token)}`,
    });

    // Record that we sent this notification to prevent duplicates
    await recordSentNotification(owner.id, visitorId, productId);

    console.log("Upsell notification sent to user:", visitorId);
  } catch (error) {
    console.error("Failed to send upsell notification:", error);
  }
}

/**
 * Handle stacker upsell/downsell purchase
 * Called when we detect a purchase of a stacker upsell product
 */
export async function handleStackerUpsellPurchase(data: {
  paymentId: string;
  companyId: string;
  productId: string;
  amountCents: number;
  currency: string;
  buyerUserId: string;
  metadata?: Record<string, string>;
}): Promise<void> {
  const { paymentId, companyId, productId, amountCents, currency, metadata } = data;

  // Check if this was from a Stacker upsell flow
  if (!metadata?.stacker_offer_type) {
    return;
  }

  // Get the community owner
  const owner = await getUserByWhopCompanyId(companyId);
  if (!owner) {
    console.log("Owner not found for stacker upsell:", companyId);
    return;
  }

  // Get product details
  const product = await getStackerProduct(productId);
  const productName = product?.name || "Upsell Product";

  // Record the conversion for analytics
  await recordUpsellConversion(owner.id, amountCents);

  // Create transaction for billing
  await createTransaction({
    userId: owner.id,
    whopPaymentId: paymentId,
    productId,
    productName,
    saleAmount: amountCents / 100,
    currency,
  });

  // Update total revenue
  await incrementTotalRevenue(owner.id, amountCents);

  console.log("Stacker upsell recorded:", {
    ownerUserId: owner.id,
    offerType: metadata.stacker_offer_type,
    amount: amountCents,
  });
}
