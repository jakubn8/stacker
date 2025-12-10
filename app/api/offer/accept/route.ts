import { NextRequest, NextResponse } from "next/server";
import { verifyOfferToken } from "@/lib/offer-tokens";
import {
  getUserByWhopCompanyId,
  getOfferSession,
  getUser,
  migrateUserToFlows,
  type FlowId,
} from "@/lib/db";
import { whopsdk } from "@/lib/whop-sdk";

export const dynamic = "force-dynamic";

/**
 * POST /api/offer/accept
 * Creates a checkout session for the upsell/downsell offer
 * Body: { token, offerType: "upsell" | "downsell" } or { offerId, offerType: "upsell" | "downsell" }
 *
 * Note: We use checkout sessions instead of one-click payments because:
 * 1. Free trigger products = no saved payment method
 * 2. Apple Pay can't be used for off-session charges
 * 3. Checkout sessions are more reliable and work for all cases
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { token, offerId, offerType } = body;

    // Must have either token or offer ID
    if (!token && !offerId) {
      return NextResponse.json(
        { error: "Token or offerId is required" },
        { status: 400 }
      );
    }

    if (!offerType) {
      return NextResponse.json(
        { error: "offerType is required" },
        { status: 400 }
      );
    }

    if (offerType !== "upsell" && offerType !== "downsell") {
      return NextResponse.json(
        { error: "Invalid offer type" },
        { status: 400 }
      );
    }

    // Payload variables to be populated from either token or Firestore session
    let buyerUserId: string;
    let companyId: string;
    let triggerProductId: string;
    let flowId: FlowId;
    let ownerId: string;

    if (offerId) {
      // Look up offer session from Firestore
      const session = await getOfferSession(offerId);
      if (!session) {
        return NextResponse.json(
          { error: "Invalid or expired offer link" },
          { status: 401 }
        );
      }

      buyerUserId = session.buyerUserId;
      companyId = session.companyId;
      triggerProductId = session.triggerProductId;
      flowId = session.flowId;
      ownerId = session.ownerId;
    } else {
      // Verify the JWT token (legacy method)
      const payload = verifyOfferToken(token!);
      if (!payload) {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 }
        );
      }

      buyerUserId = payload.buyerUserId;
      companyId = payload.companyId;
      triggerProductId = payload.triggerProductId;
      flowId = payload.flowId || "flow1";
      // For token method, we need to look up ownerId
      const ownerByCompany = await getUserByWhopCompanyId(companyId);
      if (!ownerByCompany) {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 }
        );
      }
      ownerId = ownerByCompany.id;
    }

    // Get the owner's user document
    const owner = await getUser(ownerId);
    if (!owner) {
      return NextResponse.json(
        { error: "Owner not found" },
        { status: 404 }
      );
    }

    // Get flows (with migration for legacy users)
    const flows = migrateUserToFlows(owner);
    const flow = flows[flowId];

    if (!flow) {
      return NextResponse.json(
        { error: "Flow not found" },
        { status: 400 }
      );
    }

    // Get the correct product ID based on offer type and flow
    const productId =
      offerType === "upsell"
        ? flow.upsellProductId
        : flow.downsellProductId;

    if (!productId) {
      return NextResponse.json(
        { error: `No ${offerType} product configured` },
        { status: 400 }
      );
    }

    // Get the plan for this product
    const plansResponse = await whopsdk.plans.list({
      company_id: companyId,
      product_ids: [productId],
    });
    const planData = plansResponse.data[0];

    if (!planData) {
      return NextResponse.json(
        { error: "No pricing plan found for product" },
        { status: 400 }
      );
    }

    // Create checkout session with Stacker metadata
    // The metadata will be passed through to payment.succeeded webhook
    const redirectUrl = `https://whop.com/hub/${companyId}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const checkoutSession = await (whopsdk.checkoutConfigurations as any).create({
      plan_id: planData.id,
      redirect_url: redirectUrl,
      metadata: {
        stacker_offer_type: offerType,
        stacker_buyer_user_id: buyerUserId,
        stacker_company_id: companyId,
        stacker_trigger_product_id: triggerProductId,
        stacker_owner_id: ownerId,
      },
    });

    const checkoutUrl = checkoutSession.purchase_url || checkoutSession.checkout_url || checkoutSession.url;

    console.log("Checkout session created for offer:", {
      offerType,
      productId,
      checkoutId: checkoutSession.id,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl,
      checkoutId: checkoutSession.id,
    });
  } catch (error) {
    console.error("Accept offer error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
