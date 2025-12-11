import { NextRequest, NextResponse } from "next/server";
import { whopsdk, STACKER_COMPANY_ID, STACKER_APP_ID } from "@/lib/whop-sdk";
import {
  getUserByWhopCompanyId,
  createTransaction,
  transactionExists,
  updateUserPaymentMethod,
  getStackerProduct,
  updateInvoiceStatus,
  getInvoiceByWhopPaymentId,
  markTransactionsAsInvoiced,
  updateUserNextBillingDate,
  updateBillingStatus,
  canRunAnyUpsellFlow,
  recordUpsellConversion,
  getExperienceIdByCompanyId,
  createOfferSession,
  getStackerPaymentByWhopId,
  deleteStackerPayment,
  getUser,
  startGracePeriod,
  incrementInvoiceRetryCount,
  type FlowId,
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
 * - Track sales that came through Stacker (upsells, downsells, storefront) for 5% fee
 * - Uses metadata to identify Stacker sales vs direct Whop purchases
 * - If it's our Stacker billing charge that succeeded, mark invoice as paid
 */
async function handlePaymentSucceeded(data: Record<string, unknown>): Promise<void> {
  // Log full payload to debug field names
  console.log("Payment succeeded full payload:", JSON.stringify(data, null, 2));

  // Handle nested objects - Whop may send product.id instead of product_id
  const product = data.product as { id?: string } | undefined;
  const company = data.company as { id?: string } | undefined;
  const userObj = data.user as { id?: string; email?: string } | undefined;
  const member = data.member as { id?: string } | undefined;

  const paymentId = (data.id as string) || "";
  const companyId = (data.company_id as string) || company?.id || "";
  const productId = (data.product_id as string) || product?.id || "";
  // Whop sends total in DOLLARS (e.g., 1.2 = $1.20), convert to cents for internal tracking
  const amountDollars = (data.total as number) || 0;
  const amountCents = Math.round(amountDollars * 100); // Convert to cents
  const currency = (data.currency as string) || "usd";

  // Extract metadata - this tells us if the sale came through Stacker
  const metadata = data.metadata as Record<string, string> | undefined;

  // Extract buyer info for upsell notifications
  const buyerUserId = (data.user_id as string) || userObj?.id || "";
  const buyerEmail = userObj?.email || null;
  const buyerMemberId = (data.member_id as string) || member?.id || "";

  console.log("Payment succeeded parsed:", { paymentId, companyId, productId, amountDollars, amountCents, metadata });

  // Validate required fields
  if (!paymentId || !companyId) {
    console.error("Missing required fields in payment webhook:", { paymentId, companyId });
    return;
  }

  console.log("Step 1: Checking if Stacker billing charge...");

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

  console.log("Step 2: Checking if payment already processed...");

  // Check if we've already processed this payment (idempotency)
  const exists = await transactionExists(paymentId);
  console.log("Step 2 result: transactionExists =", exists);
  if (exists) {
    console.log("Payment already processed:", paymentId);
    return;
  }

  console.log("Step 3: Looking up user by companyId:", companyId);

  // Check if this company belongs to a Stacker user
  const user = await getUserByWhopCompanyId(companyId);
  console.log("Step 3 result: user found =", !!user, user?.id);
  if (!user) {
    console.log("Company not registered with Stacker, skipping:", companyId);
    return;
  }

  console.log("Step 4: Checking if Stacker sale...");

  // IMPORTANT: Only charge 5% fee on sales that came through Stacker
  // We identify Stacker sales by:
  // 1. Checkout session metadata (stacker_offer_type or stacker_source) - for checkout flows
  // 2. Firestore stackerPayments collection - for one-click payments (payments.create doesn't support metadata)

  // Check metadata first (from checkout sessions)
  const isStackerFromMetadata =
    metadata?.stacker_offer_type === "upsell" ||
    metadata?.stacker_offer_type === "downsell" ||
    metadata?.stacker_source === "storefront";

  console.log("Step 4a: isStackerFromMetadata =", isStackerFromMetadata, "offer_type:", metadata?.stacker_offer_type);

  // Check Firestore for one-click payments
  const stackerPaymentRecord = await getStackerPaymentByWhopId(paymentId);
  const isStackerFromFirestore = !!stackerPaymentRecord;

  console.log("Step 4b: isStackerFromFirestore =", isStackerFromFirestore);

  const isStackerSale = isStackerFromMetadata || isStackerFromFirestore;
  console.log("Step 4c: isStackerSale =", isStackerSale);

  if (!isStackerSale) {
    console.log("Not a Stacker sale, skipping fee:", {
      productId,
      hasMetadata: !!metadata?.stacker_offer_type || !!metadata?.stacker_source,
      hasFirestoreRecord: isStackerFromFirestore,
    });
    return;
  }

  // Determine sale source for logging
  let saleSource = "unknown";
  let effectiveOwnerId = user.id;
  let effectiveProductId = productId;

  if (isStackerFromFirestore && stackerPaymentRecord) {
    saleSource = stackerPaymentRecord.source;
    effectiveOwnerId = stackerPaymentRecord.ownerId;
    effectiveProductId = stackerPaymentRecord.productId || productId;
    // Clean up the tracking record
    await deleteStackerPayment(stackerPaymentRecord.id);
  } else if (metadata?.stacker_offer_type) {
    saleSource = metadata.stacker_offer_type;
  } else if (metadata?.stacker_source) {
    saleSource = metadata.stacker_source;
  }

  console.log("Stacker sale detected:", {
    source: saleSource,
    fromMetadata: isStackerFromMetadata,
    fromFirestore: isStackerFromFirestore,
    productId: effectiveProductId,
    amountCents,
  });

  // Use the correct owner ID (from Firestore record if available)
  const ownerForTransaction = isStackerFromFirestore && stackerPaymentRecord
    ? await getUser(stackerPaymentRecord.ownerId)
    : user;

  if (!ownerForTransaction) {
    console.error("Owner not found for Stacker sale:", effectiveOwnerId);
    return;
  }

  // Get product name - first try our DB, then fall back to Whop API
  let productName = "Product";
  const stackerProduct = await getStackerProduct(effectiveProductId);
  if (stackerProduct) {
    productName = stackerProduct.name;
  } else {
    // Try to get product name from Whop
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const whopProduct = await (whopsdk.products as any).retrieve(effectiveProductId);
      productName = whopProduct?.title || "Product";
    } catch (err) {
      console.log("Could not fetch product name from Whop:", err);
    }
  }

  // Create transaction record for this sale (5% fee applies)
  // saleAmount is in DOLLARS for display purposes
  const transaction = await createTransaction({
    userId: ownerForTransaction.id,
    whopPaymentId: paymentId,
    productId: effectiveProductId,
    productName,
    saleAmount: amountDollars, // Already in dollars from Whop
    currency,
  });

  // Record conversion for analytics and increment total revenue (expects cents)
  // Note: recordUpsellConversion already increments totalRevenueGeneratedCents
  await recordUpsellConversion(ownerForTransaction.id, amountCents);

  console.log("Transaction recorded:", transaction.id, "Fee:", transaction.feeAmount, "Revenue:", amountCents, "cents", "Product:", effectiveProductId, "Source:", saleSource);

  // Note: Upsell notifications are handled via membership.activated webhook
  // This ensures a single source of truth for both free and paid products
}

/**
 * Handle failed payments
 * - If it's our Stacker billing charge that failed, mark invoice as failed
 * - Start grace period for the user (48h to fix payment before lockout)
 */
async function handlePaymentFailed(data: Record<string, unknown>): Promise<void> {
  const paymentId = data.id as string;
  const companyId = data.company_id as string | undefined;
  const failureMessage = (data.failure_message as string) || "Unknown error";

  console.log("Payment failed:", { paymentId, companyId, failureMessage });

  // Find the invoice by the stored whopPaymentId
  // This is more reliable than checking companyId since Whop may not always include it
  const invoice = await getInvoiceByWhopPaymentId(paymentId);

  if (!invoice) {
    // Not our billing payment - might be a customer payment that failed
    console.log("No invoice found for payment:", paymentId);
    return;
  }

  if (invoice.status === "processing") {
    // Mark invoice as failed
    await updateInvoiceStatus(invoice.id, "failed", {
      failureReason: failureMessage,
    });
    await incrementInvoiceRetryCount(invoice.id);

    // Start grace period (48 hours to fix payment before lockout)
    await startGracePeriod(invoice.userId, invoice.id);

    console.log("Invoice marked as failed:", invoice.id, failureMessage);
    console.log("User", invoice.userId, "entered grace period (48h to fix payment)");
  } else {
    console.log("Invoice not in processing state:", invoice.id, "status:", invoice.status);
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

  // Extract member ID (mber_xxx) - required for billing charges
  const memberObj = data.member as { id?: string } | undefined;
  const whopMemberId = (data.member_id as string) || memberObj?.id;

  console.log("Setup intent succeeded:", { paymentMethodId, userId, whopMemberId, card: paymentMethodObj?.card });

  if (!userId) {
    console.log("No user ID in setup intent metadata");
    return;
  }

  if (!paymentMethodId) {
    console.log("No payment method ID in setup intent data");
    return;
  }

  // Update user with payment method and member ID
  await updateUserPaymentMethod(userId, paymentMethodId, whopMemberId);
  console.log("Payment method saved for user:", userId, "member ID:", whopMemberId);
}

/**
 * Handle membership.activated - when a user gains access to a product
 * This is the SINGLE source of truth for upsell notifications
 * Works for both free and paid products
 * Now supports multiple upsell flows (up to 3)
 */
async function handleMembershipActivated(data: Record<string, unknown>): Promise<void> {
  const product = data.product as { id?: string } | undefined;
  const company = data.company as { id?: string } | undefined;
  const userObj = data.user as { id?: string; email?: string } | undefined;
  const member = data.member as { id?: string } | undefined;

  const productId = (data.product_id as string) || product?.id || "";
  const companyId = (data.company_id as string) || company?.id || "";
  const buyerUserId = (data.user_id as string) || userObj?.id || "";
  const buyerEmail = userObj?.email || null;
  const buyerMemberId = (data.member_id as string) || member?.id || "";

  console.log("Membership activated:", { productId, companyId, buyerUserId });

  // Skip if missing required data
  if (!productId || !companyId || !buyerUserId) {
    console.log("Missing required data for membership activated");
    return;
  }

  // Get the company owner (Stacker user)
  const owner = await getUserByWhopCompanyId(companyId);
  if (!owner) {
    console.log("Company not registered with Stacker:", companyId);
    return;
  }

  // Check if any upsell flow can run for this product
  const flowCheck = await canRunAnyUpsellFlow(owner.id, productId);

  console.log("Flow check result:", {
    purchasedProductId: productId,
    allowed: flowCheck.allowed,
    reason: flowCheck.reason,
    matchingFlowId: flowCheck.flowId,
  });

  if (!flowCheck.allowed || !flowCheck.flowId || !flowCheck.flow) {
    console.log("No matching upsell flow for this product:", flowCheck.reason);
    return;
  }

  // Check and send upsell notification for the matching flow
  await checkAndSendUpsellNotification({
    ownerId: owner.id,
    flowId: flowCheck.flowId,
    flow: flowCheck.flow,
    productId,
    buyerUserId,
    buyerEmail,
    buyerMemberId,
    companyId,
  });
}

/**
 * Get the Stacker app's experience_id for a given company
 * This is needed to send notifications to customers (not team members)
 *
 * Strategy:
 * 1. Check database first (saved when user accesses the app)
 * 2. Fall back to Whop API if not in database
 */
async function getExperienceIdForCompany(companyId: string): Promise<string | null> {
  // First, check if we have the experienceId stored in the database
  const storedExperienceId = await getExperienceIdByCompanyId(companyId);
  if (storedExperienceId) {
    console.log("Found experienceId in database:", storedExperienceId);
    return storedExperienceId;
  }

  // Fall back to Whop API lookup (requires experience:hidden_experience:read permission)
  try {
    console.log("Attempting to fetch experienceId from Whop API...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const experiences = await (whopsdk.experiences as any).list({
      company_id: companyId,
      app_id: STACKER_APP_ID,
    });

    // Get the first experience (there should only be one per app per company)
    const experienceList = experiences?.data || experiences || [];
    if (Array.isArray(experienceList) && experienceList.length > 0) {
      const experienceId = experienceList[0].id;
      console.log("Found experienceId from Whop API:", experienceId);
      return experienceId;
    }

    console.log("No Stacker experience found for company:", companyId);
    return null;
  } catch (error) {
    console.error("Failed to get experience for company:", error);
    console.log("Note: The user needs to access the Stacker app at least once to enable notifications.");
    return null;
  }
}

/**
 * Send upsell notification for a matched flow
 * Called from handleMembershipActivated after flow matching
 * Now uses flow-specific notification settings
 * Uses short offer IDs stored in Firestore instead of long tokens
 */
async function checkAndSendUpsellNotification(params: {
  ownerId: string;
  flowId: FlowId;
  flow: {
    notificationSettings: { title: string; content: string; enabled: boolean };
    triggerProductId: string | null;
  };
  productId: string;
  buyerUserId: string;
  buyerEmail: string | null;
  buyerMemberId: string;
  companyId: string;
}): Promise<void> {
  const { ownerId, flowId, flow, productId, buyerUserId, buyerEmail, buyerMemberId, companyId } = params;

  console.log("Sending upsell notification for flow:", { flowId, productId });

  // Check if notifications are enabled for this flow
  const notificationSettings = flow.notificationSettings || {
    title: "🎁 Wait! Your order isn't complete...",
    content: "You unlocked an exclusive offer! Tap to claim it now.",
    enabled: true,
  };

  if (!notificationSettings.enabled) {
    console.log("Notifications disabled for this flow, skipping");
    return;
  }

  // Create a short offer session in Firestore instead of long token
  // This keeps the rest_path short (~25 chars vs ~370 chars)
  const offerId = await createOfferSession({
    ownerId,
    flowId,
    buyerUserId,
    buyerEmail,
    buyerMemberId,
    companyId,
    triggerProductId: productId,
  });

  // Send push notification via Whop API
  try {
    // Get the experience_id for this company (required to send notifications to customers)
    const experienceId = await getExperienceIdForCompany(companyId);
    if (!experienceId) {
      console.error("Cannot send notification: no Stacker experience found for company:", companyId);
      return;
    }

    console.log("Sending notification via experience:", experienceId, "to user:", buyerUserId);

    // Build notification payload per Whop docs
    // Using short offer ID instead of long token
    const notificationPayload = {
      experience_id: experienceId,
      title: notificationSettings.title,
      content: notificationSettings.content,
      user_ids: [buyerUserId],
      // Deep link to offer page with short offer ID
      rest_path: `/offer?offer=${offerId}`,
    };

    console.log("Notification payload:", JSON.stringify(notificationPayload, null, 2));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (whopsdk.notifications as any).create(notificationPayload);

    console.log("Notification API response:", JSON.stringify(result, null, 2));
    console.log("Upsell notification sent to user:", buyerUserId, "for flow:", flowId, "offerId:", offerId);
  } catch (error) {
    console.error("Failed to send upsell notification:", error);
  }
}
