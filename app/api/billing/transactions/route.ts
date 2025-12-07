import { NextRequest, NextResponse } from "next/server";
import { getUser, getUserByWhopUserId, getRecentTransactions } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/billing/transactions?userId=xxx&limit=20
 * Returns transaction history for a user
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

    // Get transactions
    const transactions = await getRecentTransactions(user.id, limit);

    // Format for response
    const formattedTransactions = transactions.map((t) => ({
      id: t.id,
      whopPaymentId: t.whopPaymentId,
      productId: t.productId,
      productName: t.productName,
      saleAmount: t.saleAmount,
      feeAmount: t.feeAmount,
      currency: t.currency,
      status: t.status,
      invoiceId: t.invoiceId,
      createdAt: t.createdAt.toDate().toISOString(),
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
      count: formattedTransactions.length,
    });
  } catch (error) {
    console.error("Transactions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
