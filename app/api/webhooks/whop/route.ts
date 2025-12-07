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
  getInvoice,
  markTransactionsAsInvoiced,
  updateUserNextBillingDate,
} from "@/lib/db";
import { Timestamp } from "firebase-admin/firestore";

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
 * - If it's an upsell sale on a community owner's store, track it for billing
 * - If it's our Stacker billing charge that succeeded, mark invoice as paid
 */
async function handlePaymentSucceeded(data: Record<string, unknown>): Promise<void> {
  const paymentId = data.id as string;
  const companyId = data.company_id as string;
  const productId = data.product_id as string;
  const amount = data.total as number; // Amount in cents
  const currency = (data.currency as string) || "usd";

  console.log("Payment succeeded:", { paymentId, companyId, productId, amount });

  // Check if this is our Stacker billing charge (paid to us)
  if (companyId === STACKER_COMPANY_ID) {
    // This is a billing payment TO us
    // Find the invoice by metadata or payment reference
    const metadata = data.metadata as Record<string, string> | undefined;
    const invoiceId = metadata?.invoiceId;

    if (invoiceId) {
      const invoice = await getInvoice(invoiceId);
      if (invoice && invoice.status === "processing") {
        // Mark invoice as paid
        await updateInvoiceStatus(invoiceId, "paid", {
          whopPaymentId: paymentId,
          paidAt: Timestamp.now(),
        });

        // Mark all transactions as invoiced
        await markTransactionsAsInvoiced(invoice.transactionIds, invoiceId);

        // Update user's next billing date
        const sevenDaysFromNow = Timestamp.fromDate(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        );
        await updateUserNextBillingDate(invoice.userId, sevenDaysFromNow);

        console.log("Invoice marked as paid:", invoiceId);
      }
    }
    return;
  }

  // Check if we've already processed this payment (idempotency)
  const exists = await transactionExists(paymentId);
  if (exists) {
    console.log("Payment already processed:", paymentId);
    return;
  }

  // Check if this product is a Stacker upsell
  const isUpsell = await isStackerUpsell(productId);
  if (!isUpsell) {
    console.log("Not a Stacker upsell, skipping:", productId);
    return;
  }

  // Get the product details
  const product = await getStackerProduct(productId);
  if (!product) {
    console.log("Product not found in Stacker:", productId);
    return;
  }

  // Get the user (community owner) who owns this product
  const user = await getUserByWhopCompanyId(companyId);
  if (!user) {
    console.log("User not found for company:", companyId);
    return;
  }

  // Create transaction record
  const transaction = await createTransaction({
    userId: user.id,
    whopPaymentId: paymentId,
    productId,
    productName: product.name,
    saleAmount: amount / 100, // Convert cents to dollars
    currency,
  });

  console.log("Transaction recorded:", transaction.id, "Fee:", transaction.feeAmount);
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

  // Find the invoice by metadata
  const metadata = data.metadata as Record<string, string> | undefined;
  const invoiceId = metadata?.invoiceId;

  if (invoiceId) {
    const invoice = await getInvoice(invoiceId);
    if (invoice && invoice.status === "processing") {
      await updateInvoiceStatus(invoiceId, "failed", {
        failureReason: failureMessage,
      });
      console.log("Invoice marked as failed:", invoiceId, failureMessage);
    }
  }
}

/**
 * Handle successful setup intent (payment method vaulted)
 */
async function handleSetupIntentSucceeded(data: Record<string, unknown>): Promise<void> {
  const paymentMethodId = data.payment_method_id as string;
  const metadata = data.metadata as Record<string, string> | undefined;
  const userId = metadata?.stacker_user_id;

  console.log("Setup intent succeeded:", { paymentMethodId, userId });

  if (!userId) {
    console.log("No user ID in setup intent metadata");
    return;
  }

  // Update user with payment method
  await updateUserPaymentMethod(userId, paymentMethodId);
  console.log("Payment method saved for user:", userId);
}
