import { NextRequest, NextResponse } from "next/server";
import { getUser, getUserByWhopUserId, getRecentInvoices } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing/invoices?userId=xxx&limit=20
 * Returns invoice history for a user
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const whopUserId = searchParams.get("whopUserId");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get invoices
    const invoices = await getRecentInvoices(user.id, limit);

    // Format for response
    const formattedInvoices = invoices.map((i) => ({
      id: i.id,
      periodStart: i.periodStart.toDate().toISOString(),
      periodEnd: i.periodEnd.toDate().toISOString(),
      totalSales: i.totalSales,
      totalFee: i.totalFee,
      transactionCount: i.transactionCount,
      transactionIds: i.transactionIds,
      status: i.status,
      whopPaymentId: i.whopPaymentId,
      failureReason: i.failureReason,
      paidAt: i.paidAt?.toDate().toISOString() || null,
      retryCount: i.retryCount,
      createdAt: i.createdAt.toDate().toISOString(),
    }));

    return NextResponse.json({
      invoices: formattedInvoices,
      count: formattedInvoices.length,
    });
  } catch (error) {
    console.error("Invoices fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
