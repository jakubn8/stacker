import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { getUserByWhopCompanyId } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/storefront/checkout
 * Creates a Whop checkout session with Stacker metadata for storefront purchases
 * This allows us to track which sales came through Stacker's storefront
 *
 * Body: { planId, companyId, productId, experienceId }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { planId, companyId, productId, experienceId } = body;

    if (!planId || !companyId || !productId) {
      return NextResponse.json(
        { error: "planId, companyId, and productId are required" },
        { status: 400 }
      );
    }

    // Verify this company is registered with Stacker
    const owner = await getUserByWhopCompanyId(companyId);
    if (!owner) {
      return NextResponse.json(
        { error: "Company not registered with Stacker" },
        { status: 404 }
      );
    }

    // Build redirect URL - back to the storefront after purchase
    const redirectUrl = experienceId
      ? `https://whop.com/hub/${companyId}`  // Redirect to Whop hub after purchase
      : `https://whop.com/hub/${companyId}`;

    // Create checkout session with Stacker metadata
    // This metadata will be included in the payment.succeeded webhook
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const checkoutSession = await (whopsdk.checkoutConfigurations as any).create({
      plan_id: planId,
      redirect_url: redirectUrl,
      metadata: {
        stacker_source: "storefront",
        stacker_company_id: companyId,
        stacker_product_id: productId,
        stacker_owner_id: owner.id,
      },
    });

    // Get the checkout URL from the response
    const checkoutUrl = checkoutSession.purchase_url || checkoutSession.checkout_url || checkoutSession.url;

    if (!checkoutUrl) {
      console.error("No checkout URL in response:", checkoutSession);
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    console.log("Storefront checkout created:", {
      checkoutId: checkoutSession.id,
      productId,
      companyId,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl,
      checkoutId: checkoutSession.id,
    });
  } catch (error) {
    console.error("Storefront checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
