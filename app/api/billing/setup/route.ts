import { NextRequest, NextResponse } from "next/server";
import { whopsdk, STACKER_COMPANY_ID } from "@/lib/whop-sdk";
import { getUser, getUserByWhopUserId, createUser } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/setup
 * Creates a checkout session for payment method vaulting
 *
 * Body: { userId?: string, whopUserId: string, whopCompanyId: string, email?: string }
 * Returns: { checkoutUrl: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { userId, whopUserId, whopCompanyId, whopMemberId, email, updateExisting } = body;

    if (!whopUserId || !whopCompanyId) {
      return NextResponse.json(
        { error: "Missing required fields: whopUserId, whopCompanyId" },
        { status: 400 }
      );
    }

    // Find or create user
    let user = userId
      ? await getUser(userId)
      : await getUserByWhopUserId(whopUserId);

    if (!user) {
      // Create new user
      user = await createUser({
        whopCompanyId,
        whopMemberId: whopMemberId || "",
        whopUserId,
        email: email || null,
      });
    }

    // Check if user already has a payment method (unless updating)
    if (user.paymentMethodConnected && !updateExisting) {
      return NextResponse.json(
        { error: "Payment method already connected", alreadyConnected: true },
        { status: 400 }
      );
    }

    // Get the base URL for redirect
    // Redirect to a standalone success page since we'll be outside the Whop iframe
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUrl = `${baseUrl}/billing/success?companyId=${whopCompanyId}`;

    // Create checkout configuration in "setup" mode
    const checkoutConfig = await whopsdk.checkoutConfigurations.create({
      company_id: STACKER_COMPANY_ID,
      mode: "setup",
      redirect_url: redirectUrl,
      metadata: {
        stacker_user_id: user.id,
        whop_company_id: whopCompanyId,
      },
    });

    return NextResponse.json({
      checkoutUrl: checkoutConfig.purchase_url,
      userId: user.id,
    });
  } catch (error) {
    console.error("Billing setup error:", error);
    return NextResponse.json(
      { error: "Failed to create billing setup" },
      { status: 500 }
    );
  }
}
