import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { verifyAuthFromRequest } from "@/lib/auth";
import { getUserByWhopCompanyId } from "@/lib/db";

export const dynamic = "force-dynamic";

export interface WhopProduct {
  id: string;
  title: string;
  description: string | null;
  headline: string | null;
  route: string;
  imageUrl: string | null;
  // Pricing from the first/primary plan
  price: number;
  currency: string;
  planType: "one_time" | "renewal" | "free";
  billingPeriod: number | null; // in days, null for one-time
  planId: string | null;
  // Ownership status
  owned: boolean;
  checkoutUrl: string | null;
}

/**
 * GET /api/products?companyId=biz_xxx
 * Fetches products for a company from Whop API
 * Also checks user ownership via memberships
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");

    // Try to verify authentication
    const authResult = await verifyAuthFromRequest(request);
    const userId = authResult.authenticated ? authResult.user?.whopUserId : null;

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 }
      );
    }

    // Check if this is a valid Whop company ID (starts with biz_)
    if (!companyId.startsWith("biz_")) {
      console.log(`Skipping Whop API for non-Whop company ID: ${companyId}`);
      return NextResponse.json({
        success: true,
        products: [],
        count: 0,
        message: "No products available - connect a valid Whop company",
      });
    }

    console.log(`Fetching products for company: ${companyId}, user: ${userId || "anonymous"}`);

    // Check if we should filter hidden products (for customer-facing store)
    const filterHidden = searchParams.get("filterHidden") === "true";
    let hiddenProductIds: string[] = [];

    if (filterHidden) {
      // Get the company owner's hidden products settings
      const owner = await getUserByWhopCompanyId(companyId);
      if (owner) {
        hiddenProductIds = owner.hiddenProductIds || [];
      }
    }

    // Get user's owned products (if authenticated)
    const ownedProductIds = new Set<string>();
    if (userId) {
      try {
        // Fetch user's memberships for this company
        for await (const membership of whopsdk.memberships.list({
          company_id: companyId,
          user_ids: [userId],
        })) {
          // Add the product from each active membership
          const productId = membership.product?.id || (membership as unknown as { product_id?: string }).product_id;
          if (productId && membership.status === "active") {
            ownedProductIds.add(productId);
          }
        }
        console.log(`User owns ${ownedProductIds.size} products`);
      } catch (membershipError) {
        console.error("Failed to fetch memberships:", membershipError);
        // Continue without ownership info
      }
    }

    // Fetch products from Whop API
    const products: WhopProduct[] = [];

    try {
      // Get all products for the company
      for await (const product of whopsdk.products.list({
        company_id: companyId,
      })) {
        // Skip the Stacker app product itself
        if (product.title.toLowerCase() === "stacker") {
          continue;
        }

        // Skip hidden products (for customer-facing store)
        if (filterHidden && hiddenProductIds.includes(product.id)) {
          continue;
        }

        // Get plans for this product to get pricing
        let price = 0;
        let currency = "usd";
        let planType: "one_time" | "renewal" | "free" = "one_time";
        let billingPeriod: number | null = null;
        let planId: string | null = null;

        try {
          // Get plans for this product
          for await (const plan of whopsdk.plans.list({
            company_id: companyId,
            product_ids: [product.id],
          })) {
            currency = plan.currency || "usd";
            const pType = plan.plan_type as string;
            planType = pType === "renewal" ? "renewal" :
                       pType === "free" ? "free" : "one_time";
            billingPeriod = plan.billing_period;
            planId = plan.id;

            // For recurring plans, use renewal_price if it exists
            // For one-time plans, use initial_price
            if (planType === "renewal" && plan.renewal_price !== undefined && plan.renewal_price !== null) {
              price = plan.renewal_price;
            } else {
              price = plan.initial_price;
            }

            break; // Just use the first plan
          }
        } catch (planError) {
          console.error(`Failed to fetch plans for product ${product.id}:`, planError);
        }

        // Check if user owns this product
        const owned = ownedProductIds.has(product.id);

        // Generate checkout URL (only if they don't own it and we have a plan)
        const checkoutUrl = !owned && planId
          ? `https://whop.com/checkout/${planId}?d2c=true`
          : null;

        products.push({
          id: product.id,
          title: product.title,
          description: product.headline || null,
          headline: product.headline,
          route: product.route,
          imageUrl: null,
          price,
          currency,
          planType,
          billingPeriod,
          planId,
          owned,
          checkoutUrl,
        });
      }
    } catch (listError) {
      console.error("Failed to list products:", listError);
      return NextResponse.json(
        {
          error: "Failed to fetch products from Whop",
          details: listError instanceof Error ? listError.message : "Unknown error"
        },
        { status: 500 }
      );
    }

    console.log(`Found ${products.length} products`);

    return NextResponse.json({
      success: true,
      products,
      count: products.length,
    });
  } catch (error) {
    console.error("Products fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
