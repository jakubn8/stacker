import { NextRequest, NextResponse } from "next/server";
import { STACKER_COMPANY_ID } from "@/lib/whop-sdk";
import { getUserByWhopCompanyId, canRunAnyUpsellFlow, getExperienceIdByCompanyId } from "@/lib/db";
import { generateOfferToken } from "@/lib/offer-tokens";

export const dynamic = "force-dynamic";

/**
 * GET /api/checkout/success
 * This endpoint is configured as the post-checkout redirect URL in Whop
 * Whop sends users here after a successful purchase
 *
 * Query params from Whop:
 * - checkout_session_id: The Whop checkout session ID
 * - company_id: The company that owns the product
 * - product_id: The product that was purchased
 * - user_id: The buyer's Whop user ID
 * - member_id: The buyer's membership ID (needed for one-click payments)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("company_id");
    const productId = searchParams.get("product_id");
    const userId = searchParams.get("user_id");
    const email = searchParams.get("email");
    // member_id may be passed by Whop, or we use a placeholder (will fall back to checkout)
    const memberId = searchParams.get("member_id") || searchParams.get("membership_id") || `mem_${userId}`;

    console.log("Checkout success redirect:", { companyId, productId, userId, memberId });

    // If missing required params, redirect to Whop hub
    if (!companyId || !productId || !userId) {
      console.log("Missing required params, redirecting to Whop");
      return NextResponse.redirect("https://whop.com/hub");
    }

    // Skip if this is our Stacker company
    if (companyId === STACKER_COMPANY_ID) {
      return NextResponse.redirect("https://whop.com/hub");
    }

    // Get the community owner
    const owner = await getUserByWhopCompanyId(companyId);
    if (!owner) {
      console.log("Owner not found, redirecting to community");
      return NextResponse.redirect(`https://whop.com/hub/${companyId}`);
    }

    // Check if any upsell flow can run for this product
    const flowCheck = await canRunAnyUpsellFlow(owner.id, productId);
    if (!flowCheck.allowed || !flowCheck.flowId) {
      console.log("Upsell flow not available:", flowCheck.reason);
      return NextResponse.redirect(`https://whop.com/hub/${companyId}`);
    }

    // Generate the offer token with the matching flowId
    const token = generateOfferToken({
      buyerUserId: userId,
      buyerEmail: email,
      buyerMemberId: memberId,
      companyId: companyId,
      triggerProductId: productId,
      flowId: flowCheck.flowId,
    });

    // Get the experienceId for this company (needed for the URL path)
    const experienceId = await getExperienceIdByCompanyId(companyId);
    if (!experienceId) {
      console.log("ExperienceId not found for company, redirecting to community");
      return NextResponse.redirect(`https://whop.com/hub/${companyId}`);
    }

    // Redirect to the offer page
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://stacker.app";
    const offerUrl = `${baseUrl}/experiences/${experienceId}/offer?token=${encodeURIComponent(token)}`;

    console.log("Redirecting to offer page:", offerUrl, "for flow:", flowCheck.flowId);
    return NextResponse.redirect(offerUrl);
  } catch (error) {
    console.error("Checkout success handler error:", error);
    // On error, redirect to Whop hub as fallback
    return NextResponse.redirect("https://whop.com/hub");
  }
}
