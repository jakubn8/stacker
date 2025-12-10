import { NextRequest, NextResponse } from "next/server";
import { whopsdk, STACKER_COMPANY_ID } from "@/lib/whop-sdk";
import {
  getUserByWhopUserId,
  getUser,
  getInvoice,
  updateInvoiceStatus,
  createInvoice,
  getPendingTransactions,
} from "@/lib/db";
import { Timestamp } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/retry
 *
 * Allows a user in grace_period to retry their failed payment.
 * Creates a new payment attempt for the most recent failed invoice.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { whopUserId } = body;

    if (!whopUserId) {
      return NextResponse.json(
        { error: "whopUserId is required" },
        { status: 400 }
      );
    }

    // Get the user
    const user = await getUserByWhopUserId(whopUserId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user is in grace period or lockout
    if (user.billingStatus === "active") {
      return NextResponse.json(
        { error: "No payment retry needed - account is active" },
        { status: 400 }
      );
    }

    // Check if user has a payment method
    if (!user.paymentMethodId) {
      return NextResponse.json(
        { error: "No payment method connected. Please add a payment method first." },
        { status: 400 }
      );
    }

    // Get pending transactions (these weren't successfully billed yet)
    const pendingTransactions = await getPendingTransactions(user.id);

    if (pendingTransactions.length === 0) {
      // No pending fees - just need to clear the status
      // This shouldn't happen normally, but handle it gracefully
      return NextResponse.json({
        success: true,
        message: "No pending fees to charge",
        totalFee: 0,
      });
    }

    // Calculate total fee from pending transactions
    const totalFee = pendingTransactions.reduce(
      (sum, t) => sum + t.feeAmount,
      0
    );
    const totalSales = pendingTransactions.reduce(
      (sum, t) => sum + t.saleAmount,
      0
    );

    // Create a new invoice for this retry attempt
    const periodEnd = Timestamp.now();
    const periodStart = user.billingCycleStart || Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const invoice = await createInvoice({
      userId: user.id,
      periodStart,
      periodEnd,
      totalSales: Math.round(totalSales * 100) / 100,
      totalFee: Math.round(totalFee * 100) / 100,
      transactionCount: pendingTransactions.length,
      transactionIds: pendingTransactions.map((t) => t.id),
    });

    // Update invoice to processing
    await updateInvoiceStatus(invoice.id, "processing");

    console.log(`Retry payment for user ${user.id}: $${totalFee.toFixed(2)}`);

    // Try to get the correct payment method ID from Whop
    let paymentMethodIdToUse = user.paymentMethodId;
    try {
      const paymentMethods = await whopsdk.paymentMethods.list({
        member_id: user.whopMemberId,
      });
      console.log("Payment methods for member:", JSON.stringify(paymentMethods, null, 2));

      // Use the first payment method if available
      if (paymentMethods.data && paymentMethods.data.length > 0) {
        paymentMethodIdToUse = paymentMethods.data[0].id;
        console.log("Using payment method from API:", paymentMethodIdToUse);
      }
    } catch (listError) {
      console.log("Could not list payment methods:", listError);
    }

    console.log("Payment params:", {
      company_id: STACKER_COMPANY_ID,
      member_id: user.whopMemberId,
      payment_method_id: paymentMethodIdToUse,
    });

    // Attempt to charge the user
    try {
      const payment = await whopsdk.payments.create({
        company_id: STACKER_COMPANY_ID,
        member_id: user.whopMemberId,
        payment_method_id: paymentMethodIdToUse,
        plan: {
          initial_price: Math.round(totalFee * 100), // Convert to cents
          currency: "usd",
          plan_type: "one_time",
          product: {
            title: `Stacker Fee (Retry - ${formatDateRange(periodStart.toDate(), periodEnd.toDate())})`,
            external_identifier: `stacker_invoice_${invoice.id}_user_${user.id}_retry`,
          },
        },
      });

      // Store the payment ID on the invoice
      await updateInvoiceStatus(invoice.id, "processing", {
        whopPaymentId: payment.id,
      });

      console.log(`Retry payment created: ${payment.id}`);

      return NextResponse.json({
        success: true,
        message: "Payment retry initiated",
        invoiceId: invoice.id,
        paymentId: payment.id,
        totalFee: Math.round(totalFee * 100) / 100,
      });
    } catch (paymentError) {
      console.error(`Retry payment failed for user ${user.id}:`, paymentError);

      // Mark invoice as failed
      await updateInvoiceStatus(invoice.id, "failed", {
        failureReason:
          paymentError instanceof Error
            ? paymentError.message
            : "Unknown error",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Payment failed",
          details: paymentError instanceof Error ? paymentError.message : "Unknown error",
        },
        { status: 402 }
      );
    }
  } catch (error) {
    console.error("Retry billing error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/billing/retry
 *
 * Check if user needs to retry payment and get details
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const whopUserId = searchParams.get("whopUserId");

    if (!whopUserId) {
      return NextResponse.json(
        { error: "whopUserId is required" },
        { status: 400 }
      );
    }

    const user = await getUserByWhopUserId(whopUserId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // If active, no retry needed
    if (user.billingStatus === "active") {
      return NextResponse.json({
        needsRetry: false,
        billingStatus: "active",
      });
    }

    // Get pending transactions to calculate owed amount
    const pendingTransactions = await getPendingTransactions(user.id);
    const totalFee = pendingTransactions.reduce(
      (sum, t) => sum + t.feeAmount,
      0
    );

    // Get grace period info
    const gracePeriodEndsAt = user.gracePeriodEndsAt?.toDate();
    const paymentFailedAt = user.paymentFailedAt?.toDate();
    const hoursRemaining = gracePeriodEndsAt
      ? Math.max(0, (gracePeriodEndsAt.getTime() - Date.now()) / (1000 * 60 * 60))
      : 0;

    // Get last failed invoice details if available
    let lastFailedInvoice = null;
    if (user.lastFailedInvoiceId) {
      const invoice = await getInvoice(user.lastFailedInvoiceId);
      if (invoice) {
        lastFailedInvoice = {
          id: invoice.id,
          totalFee: invoice.totalFee,
          failureReason: invoice.failureReason,
          createdAt: invoice.createdAt.toDate().toISOString(),
        };
      }
    }

    return NextResponse.json({
      needsRetry: true,
      billingStatus: user.billingStatus,
      totalFeeOwed: Math.round(totalFee * 100) / 100,
      pendingTransactionCount: pendingTransactions.length,
      gracePeriod: {
        endsAt: gracePeriodEndsAt?.toISOString() || null,
        hoursRemaining: Math.round(hoursRemaining * 10) / 10,
        isExpired: hoursRemaining <= 0,
      },
      paymentFailedAt: paymentFailedAt?.toISOString() || null,
      lastFailedInvoice,
      hasPaymentMethod: !!user.paymentMethodId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Helper function to format date range
function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startStr = start.toLocaleDateString("en-US", options);
  const endStr = end.toLocaleDateString("en-US", options);
  return `${startStr} - ${endStr}`;
}
