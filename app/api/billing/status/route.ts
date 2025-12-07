import { NextRequest, NextResponse } from "next/server";
import {
  getUser,
  getUserByWhopUserId,
  getBillingSummary,
  getRecentTransactions,
  getRecentInvoices,
} from "@/lib/db";
import { verifyAuthFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing/status?userId=xxx OR ?whopUserId=xxx
 * Returns the current billing status for a user
 *
 * Authentication: Verifies x-whop-user-token header when available.
 * Falls back to query params for development/testing.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get("userId");
    let whopUserId = searchParams.get("whopUserId");

    // Try to verify authentication from token
    const authResult = await verifyAuthFromRequest(request);

    if (authResult.authenticated && authResult.user) {
      // Use authenticated user ID (more secure)
      whopUserId = authResult.user.whopUserId;
      if (authResult.user.dbUserId) {
        userId = authResult.user.dbUserId;
      }
    }

    if (!userId && !whopUserId) {
      return NextResponse.json(
        { error: "Missing userId or whopUserId parameter" },
        { status: 400 }
      );
    }

    // Find user
    const user = userId
      ? await getUser(userId)
      : await getUserByWhopUserId(whopUserId!);

    if (!user) {
      return NextResponse.json(
        { error: "User not found", exists: false },
        { status: 404 }
      );
    }

    // Get billing summary
    const summary = await getBillingSummary(user.id);

    // Get recent transactions
    const recentTransactions = await getRecentTransactions(user.id, 5);

    // Get recent invoices
    const recentInvoices = await getRecentInvoices(user.id, 5);

    // Format transactions for response
    const formattedTransactions = recentTransactions.map((t) => ({
      id: t.id,
      productName: t.productName,
      saleAmount: t.saleAmount,
      feeAmount: t.feeAmount,
      currency: t.currency,
      status: t.status,
      createdAt: t.createdAt.toDate().toISOString(),
    }));

    // Format invoices for response
    const formattedInvoices = recentInvoices.map((i) => ({
      id: i.id,
      periodStart: i.periodStart.toDate().toISOString(),
      periodEnd: i.periodEnd.toDate().toISOString(),
      totalSales: i.totalSales,
      totalFee: i.totalFee,
      transactionCount: i.transactionCount,
      status: i.status,
      paidAt: i.paidAt?.toDate().toISOString() || null,
    }));

    // Calculate grace period info if applicable
    let gracePeriodInfo = null;
    if (user.billingStatus === "grace_period" && user.gracePeriodEndsAt) {
      const now = new Date();
      const gracePeriodEnd = user.gracePeriodEndsAt.toDate();
      const hoursRemaining = Math.max(0, (gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60));

      gracePeriodInfo = {
        paymentFailedAt: user.paymentFailedAt?.toDate().toISOString() || null,
        endsAt: gracePeriodEnd.toISOString(),
        hoursRemaining: Math.round(hoursRemaining * 10) / 10,
        isExpired: hoursRemaining <= 0,
        lastFailedInvoiceId: user.lastFailedInvoiceId,
      };
    }

    return NextResponse.json({
      user: {
        id: user.id,
        paymentMethodConnected: user.paymentMethodConnected,
        email: user.email,
      },
      billing: {
        status: user.billingStatus,
        pendingFee: summary.pendingFee,
        pendingTransactionCount: summary.pendingTransactionCount,
        nextBillingDate: summary.nextBillingDate?.toISOString() || null,
        daysTillBilling: summary.daysTillBilling,
        totalRevenueGeneratedCents: user.totalRevenueGeneratedCents,
      },
      gracePeriod: gracePeriodInfo,
      recentTransactions: formattedTransactions,
      recentInvoices: formattedInvoices,
    });
  } catch (error) {
    console.error("Billing status error:", error);
    return NextResponse.json(
      { error: "Failed to get billing status" },
      { status: 500 }
    );
  }
}
