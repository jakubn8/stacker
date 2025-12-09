import { NextRequest, NextResponse } from "next/server";
import { verifyOfferToken } from "@/lib/offer-tokens";
import { getUserByWhopCompanyId, recordUpsellView, migrateUserToFlows, getOfferSession, getUser, type FlowId } from "@/lib/db";
import { whopsdk } from "@/lib/whop-sdk";

export const dynamic = "force-dynamic";

/**
 * GET /api/offer/data?token=xxx or /api/offer/data?offer=xxx
 * Fetches the offer data for a customer based on their secure token or short offer ID
 * Now supports multiple flows - uses flowId from token/session to get correct products
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const offerId = searchParams.get("offer");

    // Must have either token or offer ID
    if (!token && !offerId) {
      return NextResponse.json(
        { error: "Token or offer ID is required" },
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

    // Get the specific flow
    const flow = flows[flowId];

    if (!flow) {
      return NextResponse.json(
        { error: "Flow not found", redirect: true },
        { status: 400 }
      );
    }

    // Check if flow is active
    if (!flow.isActive) {
      return NextResponse.json(
        { error: "Upsell flow is not active", redirect: true },
        { status: 400 }
      );
    }

    // Verify the trigger product matches
    if (flow.triggerProductId !== triggerProductId) {
      return NextResponse.json(
        { error: "Product mismatch", redirect: true },
        { status: 400 }
      );
    }

    // Get product IDs from the specific flow
    const upsellProductId = flow.upsellProductId;
    const downsellProductId = flow.downsellProductId;

    if (!upsellProductId) {
      return NextResponse.json(
        { error: "No upsell product configured", redirect: true },
        { status: 400 }
      );
    }

    // Fetch upsell product details
    const [upsellProduct, upsellPlansResponse] = await Promise.all([
      whopsdk.products.retrieve(upsellProductId),
      whopsdk.plans.list({
        company_id: companyId,
        product_ids: [upsellProductId],
      }),
    ]);

    const upsellPlan = upsellPlansResponse.data[0];
    if (!upsellPlan) {
      return NextResponse.json(
        { error: "No pricing plan found for upsell product" },
        { status: 400 }
      );
    }

    // Fetch downsell product if exists
    let downsellData = null;
    if (downsellProductId) {
      const [downsellProduct, downsellPlansResponse] = await Promise.all([
        whopsdk.products.retrieve(downsellProductId),
        whopsdk.plans.list({
          company_id: companyId,
          product_ids: [downsellProductId],
        }),
      ]);

      const downsellPlan = downsellPlansResponse.data[0];
      if (downsellPlan) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dsProduct = downsellProduct as any;
        downsellData = {
          product: {
            id: dsProduct.id,
            name: dsProduct.name,
            description: dsProduct.description,
            imageUrl: dsProduct.images?.[0]?.source_url || null,
          },
          plan: {
            id: downsellPlan.id,
            price: downsellPlan.initial_price / 100, // Convert from cents
            billingPeriod: downsellPlan.billing_period,
            isRecurring: !!downsellPlan.renewal_price,
          },
          // Use flow-specific offer settings
          settings: flow.offerSettings.downsell,
        };
      }
    }

    // Record the view
    await recordUpsellView(owner.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usProduct = upsellProduct as any;

    return NextResponse.json({
      success: true,
      // Session info for the accept flow
      buyerUserId,
      companyId,
      flowId,
      // Upsell data
      upsell: {
        product: {
          id: usProduct.id,
          name: usProduct.name,
          description: usProduct.description,
          imageUrl: usProduct.images?.[0]?.source_url || null,
        },
        plan: {
          id: upsellPlan.id,
          price: upsellPlan.initial_price / 100, // Convert from cents
          billingPeriod: upsellPlan.billing_period,
          isRecurring: !!upsellPlan.renewal_price,
        },
        // Use flow-specific offer settings
        settings: flow.offerSettings.upsell,
      },
      // Downsell data (if configured)
      downsell: downsellData,
      // Where to redirect after
      redirectUrl: `https://whop.com/hub/${companyId}`,
    });
  } catch (error) {
    console.error("Get offer data error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
