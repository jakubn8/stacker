import { NextRequest, NextResponse } from "next/server";
import { whopsdk, STACKER_COMPANY_ID } from "@/lib/whop-sdk";
import {
  getUserByWhopUserId,
  getPendingTransactions,
  createInvoice,
  updateInvoiceStatus,
} from "@/lib/db";
import { Timestamp } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/pay-now
 *
 * Creates a one-time checkout session for the user to pay their outstanding
 * balance with ANY payment method (doesn't vault/save it).
 *
 * Use this when:
 * - User's saved card is failing
 * - User wants to pay with a different card
 * - User wants to clear their balance immediately
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

    // Get pending transactions
    const pendingTransactions = await getPendingTransactions(user.id);

    if (pendingTransactions.length === 0) {
      return NextResponse.json(
        { error: "No pending fees to pay" },
        { status: 400 }
      );
    }

    // Calculate total fee
    const totalFee = pendingTransactions.reduce(
      (sum, t) => sum + t.feeAmount,
      0
    );
    const totalSales = pendingTransactions.reduce(
      (sum, t) => sum + t.saleAmount,
      0
    );

    // Minimum charge check
    if (totalFee < 0.50) {
      return NextResponse.json(
        { error: "Minimum payment amount is $0.50" },
        { status: 400 }
      );
    }

    // Create invoice for this payment
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

    // Build redirect URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUrl = `${appUrl}/dashboard/${user.whopCompanyId}?billing=success&invoice=${invoice.id}`;

    console.log(`Creating one-time checkout for user ${user.id}: $${totalFee.toFixed(2)}`);

    // Create a one-time checkout for payment
    // Using mode: "payment" with a plan object for the fee amount
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const checkoutConfig = await (whopsdk.checkoutConfigurations.create as any)({
        redirect_url: redirectUrl,
        plan: {
          company_id: STACKER_COMPANY_ID, // company_id goes inside plan object
          initial_price: Math.round(totalFee * 100), // Convert to cents
          currency: "usd",
          plan_type: "one_time",
          product: {
            title: `Stacker Fee Payment - $${totalFee.toFixed(2)}`,
            external_identifier: `stacker_paynow_${invoice.id}_user_${user.id}`,
          },
        },
        metadata: {
          stacker_user_id: user.id,
          stacker_invoice_id: invoice.id,
          payment_type: "pay_now",
        },
      });

      console.log(`One-time checkout created: ${checkoutConfig.id}`);

      // The checkout URL might be purchase_url or checkout_url depending on API version
      const checkoutUrl = checkoutConfig.purchase_url || checkoutConfig.checkout_url || checkoutConfig.url;

      return NextResponse.json({
        success: true,
        checkoutUrl,
        invoiceId: invoice.id,
        totalFee: Math.round(totalFee * 100) / 100,
        message: "Redirect user to checkout URL to complete payment",
      });
    } catch (checkoutError) {
      console.error(`Checkout creation failed for user ${user.id}:`, checkoutError);

      // Mark invoice as failed since we couldn't create checkout
      await updateInvoiceStatus(invoice.id, "failed", {
        failureReason:
          checkoutError instanceof Error
            ? checkoutError.message
            : "Failed to create checkout",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create payment checkout",
          details: checkoutError instanceof Error ? checkoutError.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Pay now error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/billing/pay-now
 *
 * Get info about what needs to be paid
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

    // Get pending transactions
    const pendingTransactions = await getPendingTransactions(user.id);
    const totalFee = pendingTransactions.reduce(
      (sum, t) => sum + t.feeAmount,
      0
    );
    const totalSales = pendingTransactions.reduce(
      (sum, t) => sum + t.saleAmount,
      0
    );

    return NextResponse.json({
      billingStatus: user.billingStatus,
      hasPendingFees: pendingTransactions.length > 0,
      totalFeeOwed: Math.round(totalFee * 100) / 100,
      totalSales: Math.round(totalSales * 100) / 100,
      transactionCount: pendingTransactions.length,
      canPayNow: pendingTransactions.length > 0 && totalFee >= 0.50,
      minimumPayment: 0.50,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
