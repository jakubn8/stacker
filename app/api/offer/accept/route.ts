import { NextRequest, NextResponse } from "next/server";
import { verifyOfferToken } from "@/lib/offer-tokens";
import {
  getUserByWhopCompanyId,
  recordUpsellConversion,
  createTransaction,
} from "@/lib/db";
import { whopsdk } from "@/lib/whop-sdk";

export const dynamic = "force-dynamic";

/**
 * POST /api/offer/accept
 * ONE-CLICK PAYMENT: Charges the customer's saved payment method directly
 * Body: { token, offerType: "upsell" | "downsell" }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { token, offerType } = body;

    if (!token || !offerType) {
      return NextResponse.json(
        { error: "Token and offerType are required" },
        { status: 400 }
      );
    }

    if (offerType !== "upsell" && offerType !== "downsell") {
      return NextResponse.json(
        { error: "Invalid offer type" },
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

    // Get the correct product ID based on offer type
    const productId =
      offerType === "upsell"
        ? owner.flowConfig.upsellProductId
        : owner.flowConfig.downsellProductId;

    if (!productId) {
      return NextResponse.json(
        { error: `No ${offerType} product configured` },
        { status: 400 }
      );
    }

    // Get the plan for this product to get the price
    const plansResponse = await whopsdk.plans.list({
      company_id: payload.companyId,
      product_ids: [productId],
    });
    const planData = plansResponse.data[0];

    if (!planData) {
      return NextResponse.json(
        { error: "No pricing plan found for product" },
        { status: 400 }
      );
    }

    // Get the buyer's saved payment methods
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paymentMethodsResponse = await (whopsdk.paymentMethods as any).list({
      member_id: payload.buyerMemberId,
    });

    const paymentMethods = paymentMethodsResponse.data || [];

    if (paymentMethods.length === 0) {
      // No saved payment method - fall back to checkout session
      console.log("No saved payment method, falling back to checkout");
      return await createCheckoutFallback(payload, planData, offerType);
    }

    // Use the first (most recent) payment method
    const paymentMethodId = paymentMethods[0].id;

    // Create ONE-CLICK payment directly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const planInfo = planData as any;
    const price = planInfo.initial_price || planInfo.price || 0;
    const currency = planInfo.currency || "usd";
    const planType = planInfo.renewal_price ? "renewal" : "one_time";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payment = await (whopsdk.payments as any).create({
      plan: {
        initial_price: price,
        currency: currency,
        plan_type: planType,
        ...(planType === "renewal" && { renewal_price: planInfo.renewal_price }),
      },
      company_id: payload.companyId,
      member_id: payload.buyerMemberId,
      payment_method_id: paymentMethodId,
      metadata: {
        stacker_offer_type: offerType,
        stacker_buyer_user_id: payload.buyerUserId,
        stacker_company_id: payload.companyId,
        stacker_trigger_product_id: payload.triggerProductId,
        stacker_product_id: productId,
      },
    });

    console.log("One-click payment initiated:", payment.id);

    // Payment is processed async - webhook will handle recording the transaction
    // Return success immediately
    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      status: payment.status || "processing",
      message: "Payment processing - you'll receive confirmation shortly",
    });
  } catch (error) {
    console.error("Accept offer error:", error);

    // If one-click fails, provide helpful message
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Check if it's a payment method error
    if (errorMessage.includes("payment_method") || errorMessage.includes("card")) {
      return NextResponse.json(
        {
          error: "Payment failed - please update your payment method",
          needsPaymentMethod: true,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Fallback: Create checkout session if no saved payment method
 */
async function createCheckoutFallback(
  payload: { companyId: string; buyerUserId: string; triggerProductId: string; buyerMemberId: string },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  planData: any,
  offerType: string
): Promise<NextResponse> {
  const redirectUrl = `https://whop.com/hub/${payload.companyId}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const checkoutSession = await (whopsdk.checkoutConfigurations.create as any)({
    plan_id: planData.id,
    redirect_url: redirectUrl,
    metadata: {
      stacker_offer_type: offerType,
      stacker_buyer_user_id: payload.buyerUserId,
      stacker_company_id: payload.companyId,
      stacker_trigger_product_id: payload.triggerProductId,
    },
  });

  const checkoutUrl = checkoutSession.purchase_url || checkoutSession.checkout_url || checkoutSession.url;

  return NextResponse.json({
    success: true,
    checkoutUrl,
    checkoutId: checkoutSession.id,
    fallback: true, // Indicates we used checkout instead of one-click
  });
}

/**
 * This is called by the webhook after successful purchase
 * Records the conversion and creates a transaction
 */
export async function recordOfferPurchase(data: {
  ownerUserId: string;
  buyerUserId: string;
  productId: string;
  productName: string;
  amountCents: number;
  whopPaymentId: string;
  currency: string;
}): Promise<void> {
  // Record the conversion for analytics
  await recordUpsellConversion(data.ownerUserId, data.amountCents);

  // Create a transaction for billing purposes
  await createTransaction({
    userId: data.ownerUserId,
    whopPaymentId: data.whopPaymentId,
    productId: data.productId,
    productName: data.productName,
    saleAmount: data.amountCents / 100,
    currency: data.currency,
  });
}
