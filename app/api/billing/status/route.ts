import { NextRequest, NextResponse } from "next/server";
import {
  getUser,
  getUserByWhopUserId,
  getBillingSummary,
  getRecentTransactions,
  getRecentInvoices,
} from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing/status?userId=xxx OR ?whopUserId=xxx
 * Returns the current billing status for a user
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const whopUserId = searchParams.get("whopUserId");

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

    return NextResponse.json({
      user: {
        id: user.id,
        paymentMethodConnected: user.paymentMethodConnected,
        email: user.email,
      },
      billing: {
        pendingFee: summary.pendingFee,
        pendingTransactionCount: summary.pendingTransactionCount,
        nextBillingDate: summary.nextBillingDate?.toISOString() || null,
        daysTillBilling: summary.daysTillBilling,
      },
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
