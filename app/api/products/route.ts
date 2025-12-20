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
  imageUrl: string | null; // The resolved image URL (Whop first, then custom)
  whopImageUrl: string | null; // Original image from Whop API
  customImageUrl: string | null; // Custom override image uploaded by creator
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
 *
 * Parameters:
 * - companyId: Required. The Whop company ID (biz_xxx)
 * - experienceId: Optional. If provided, fetches the experience and uses its "App access"
 *   products as the allowed list. This is the recommended approach.
 * - allowedProductIds: Optional. Comma-separated list of product IDs to filter by.
 *   If provided, only these products will be returned (from "App access" settings).
 *   Use this if you already have the allowed IDs from a previous experience fetch.
 * - filterHidden: Optional. If "true", also filters out products hidden by the owner in Stacker.
 *
 * Priority: experienceId > allowedProductIds > fallback to filtered list
 *
 * Also checks user ownership via memberships
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const experienceId = searchParams.get("experienceId");
    const allowedProductIdsParam = searchParams.get("allowedProductIds");

    // Parse allowed product IDs (comma-separated)
    let allowedProductIds: string[] | null = allowedProductIdsParam
      ? allowedProductIdsParam.split(",").map(id => id.trim()).filter(Boolean)
      : null;

    // If experienceId is provided, fetch the experience to get allowed products
    if (experienceId && !allowedProductIds) {
      try {
        const experience = await whopsdk.experiences.retrieve(experienceId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const experienceAny = experience as any;
        const allowedProducts = experienceAny.products || [];
        const fetchedIds = allowedProducts.map((p: { id: string }) => p.id);
        allowedProductIds = fetchedIds;
        console.log(`Fetched ${fetchedIds.length} allowed products from experience ${experienceId}`);
      } catch (expError) {
        console.error("Failed to fetch experience for product filtering:", expError);
        // Continue without filtering - will fall back to filtered list
      }
    }

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

    console.log(`Fetching products for company: ${companyId}, user: ${userId || "anonymous"}, allowedIds: ${allowedProductIds?.length || "all"}`);

    // Check if we should filter hidden products (for customer-facing store)
    const filterHidden = searchParams.get("filterHidden") === "true";
    let hiddenProductIds: string[] = [];
    let productImages: Record<string, string> = {};

    // Get the company owner's settings (hidden products and custom images)
    const owner = await getUserByWhopCompanyId(companyId);
    if (owner) {
      if (filterHidden) {
        hiddenProductIds = owner.hiddenProductIds || [];
      }
      productImages = owner.productImages || {};
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
          // Add the product from each active/completed membership
          // "active" = ongoing subscription, "completed" = one-time purchase fulfilled
          const productId = membership.product?.id || (membership as unknown as { product_id?: string }).product_id;
          const status = membership.status;
          if (productId && (status === "active" || status === "completed")) {
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
      let productIds: string[] = [];

      // If allowedProductIds is provided, use those directly (from "App access" settings)
      // This is more efficient as we skip the list call entirely
      if (allowedProductIds && allowedProductIds.length > 0) {
        console.log(`Using allowed product IDs from App access: ${allowedProductIds.length} products`);
        productIds = allowedProductIds.filter(id => {
          // Skip hidden products (for customer-facing store)
          if (filterHidden && hiddenProductIds.includes(id)) {
            return false;
          }
          return true;
        });
      } else {
        // Fallback: List all products with proper filters
        // This should rarely be used - allowedProductIds should always be provided
        console.log("Warning: No allowedProductIds provided, listing all products with filters");
        for await (const product of whopsdk.products.list({
          company_id: companyId,
          visibilities: ["visible"], // Only visible products (not archived/hidden)
          product_types: ["regular"], // Only regular products (not apps)
        })) {
          // Skip hidden products (for customer-facing store)
          if (filterHidden && hiddenProductIds.includes(product.id)) {
            continue;
          }

          productIds.push(product.id);
        }
      }

      // Fetch full product details (including images) in parallel
      const fullProducts = await Promise.all(
        productIds.map(async (productId) => {
          try {
            const fullProduct = await whopsdk.products.retrieve(productId);
            return fullProduct;
          } catch (err) {
            console.error(`Failed to retrieve product ${productId}:`, err);
            return null;
          }
        })
      );

      // Process each product with full details
      for (const product of fullProducts) {
        if (!product) continue;

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

            // For recurring plans, use renewal_price (what they pay each month)
            // For one-time plans, use initial_price (what they pay once)
            if (planType === "renewal") {
              price = plan.renewal_price ?? plan.initial_price;
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const productAny = product as any;

        // Image priority:
        // 1. Custom override (if explicitly set by creator) - takes highest priority
        // 2. Whop API images (pulled automatically from Whop)
        // 3. null if neither exists
        // This allows creators to override Whop images when needed
        const whopImageUrl = productAny.images?.[0]?.source_url || null;
        const customImageUrl = productImages[product.id] || null;

        // If creator has set a custom image, use it (override)
        // Otherwise, use Whop's image (default behavior)
        const imageUrl = customImageUrl || whopImageUrl;

        products.push({
          id: product.id,
          title: product.title,
          description: product.headline || null,
          headline: product.headline,
          route: product.route,
          imageUrl,
          whopImageUrl,
          customImageUrl,
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
