import { NextRequest, NextResponse } from "next/server";
import { verifyOfferToken } from "@/lib/offer-tokens";
import { getUserByWhopCompanyId, recordUpsellView } from "@/lib/db";
import { whopsdk } from "@/lib/whop-sdk";

export const dynamic = "force-dynamic";

/**
 * GET /api/offer/data?token=xxx
 * Fetches the offer data for a customer based on their secure token
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Verify the token
    const payload = verifyOfferToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Get the community owner's settings
    const owner = await getUserByWhopCompanyId(payload.companyId);
    if (!owner) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Check if flow is active
    if (!owner.flowConfig.isActive) {
      return NextResponse.json(
        { error: "Upsell flow is not active", redirect: true },
        { status: 400 }
      );
    }

    // Verify the trigger product matches
    if (owner.flowConfig.triggerProductId !== payload.triggerProductId) {
      return NextResponse.json(
        { error: "Product mismatch", redirect: true },
        { status: 400 }
      );
    }

    // Fetch product data from Whop
    const upsellProductId = owner.flowConfig.upsellProductId;
    const downsellProductId = owner.flowConfig.downsellProductId;

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
        company_id: payload.companyId,
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
          company_id: payload.companyId,
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
          settings: owner.offerSettings.downsell,
        };
      }
    }

    // Record the view
    await recordUpsellView(owner.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usProduct = upsellProduct as any;

    return NextResponse.json({
      success: true,
      // Token info for the accept flow
      buyerUserId: payload.buyerUserId,
      companyId: payload.companyId,
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
        settings: owner.offerSettings.upsell,
      },
      // Downsell data (if configured)
      downsell: downsellData,
      // Where to redirect after
      redirectUrl: `https://whop.com/hub/${payload.companyId}`,
    });
  } catch (error) {
    console.error("Get offer data error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
