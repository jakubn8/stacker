import { NextRequest, NextResponse } from "next/server";
import {
  getUserByWhopUserId,
  createUser,
  updateHiddenProducts,
  migrateUserToFlows,
  updateFlow,
  updateFlowNotificationSettings,
  updateFlowOfferSettings,
  addSyncedProducts,
  type OfferPageSettings,
  type FlowId,
} from "@/lib/db";
import { verifyAuthFromRequest } from "@/lib/auth";
import { whopsdk } from "@/lib/whop-sdk";

export const dynamic = "force-dynamic";

/**
 * GET /api/flow/settings?whopUserId=xxx&companyId=biz_xxx
 * Returns all flows and settings for a user
 * Auto-creates user if not found
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    let whopUserId = searchParams.get("whopUserId");
    const companyId = searchParams.get("companyId");

    // Try to verify authentication from token
    const authResult = await verifyAuthFromRequest(request);

    if (authResult.authenticated && authResult.user) {
      whopUserId = authResult.user.whopUserId;
    }

    if (!whopUserId) {
      return NextResponse.json(
        { error: "whopUserId is required" },
        { status: 400 }
      );
    }

    let user = await getUserByWhopUserId(whopUserId);

    // Auto-create user if not found
    if (!user && companyId) {
      console.log(`Auto-creating user: ${whopUserId} for company: ${companyId}`);

      // Fetch user and company info from Whop API for admin dashboard
      let email: string | null = null;
      let username: string | null = null;
      let companyName: string | null = null;

      try {
        // Fetch user info
        const whopUser = await whopsdk.users.retrieve(whopUserId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userData = whopUser as any;
        console.log(`Whop user data keys:`, Object.keys(userData));
        console.log(`Whop user data:`, JSON.stringify(userData, null, 2));
        email = userData.email || null;
        username = userData.username || null;
        console.log(`Fetched user info: email=${email}, username=${username}`);
      } catch (err) {
        console.log("Could not fetch user info from Whop:", err);
      }

      try {
        // Fetch company info
        const whopCompany = await whopsdk.companies.retrieve(companyId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const companyData = whopCompany as any;
        companyName = companyData.title || companyData.name || null;
        console.log(`Fetched company info: name=${companyName}`);
      } catch (err) {
        console.log("Could not fetch company info from Whop:", err);
      }

      user = await createUser({
        whopUserId,
        whopCompanyId: companyId,
        email,
        username,
        companyName,
      });
    }

    if (!user) {
      // Return empty defaults if no companyId provided to create user
      return NextResponse.json({
        success: true,
        flows: null,
        // Legacy fields for backwards compatibility
        flowConfig: null,
        offerSettings: null,
        notificationSettings: null,
      });
    }

    // Get all flows (with migration for legacy users)
    const flows = migrateUserToFlows(user);

    return NextResponse.json({
      success: true,
      // New: all flows
      flows,
      // Legacy fields for backwards compatibility with existing editor
      flowConfig: user.flowConfig,
      offerSettings: user.offerSettings,
      notificationSettings: user.notificationSettings,
      hiddenProductIds: user.hiddenProductIds || [],
      productImages: user.productImages || {},
    });
  } catch (error) {
    console.error("Get flow settings error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/flow/settings
 * Save flow config and/or offer settings
 * Now supports flowId to update specific flow
 * Body: { whopUserId, companyId?, flowId?, flowConfig?, upsellSettings?, downsellSettings?, notificationSettings?, hiddenProductIds?, storefrontProductIds? }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    let {
      whopUserId,
      companyId,
      flowId,
      flowConfig,
      upsellSettings,
      downsellSettings,
      notificationSettings,
      hiddenProductIds,
      storefrontProductIds, // Visible storefront products to sync for 5% fee
    } = body;

    // Try to verify authentication from token
    const authResult = await verifyAuthFromRequest(request);

    if (authResult.authenticated && authResult.user) {
      whopUserId = authResult.user.whopUserId;
    }

    if (!whopUserId) {
      return NextResponse.json(
        { error: "whopUserId is required" },
        { status: 400 }
      );
    }

    let user = await getUserByWhopUserId(whopUserId);

    // Auto-create user if not found
    if (!user && companyId) {
      console.log(`Auto-creating user on save: ${whopUserId} for company: ${companyId}`);
      user = await createUser({
        whopUserId,
        whopCompanyId: companyId,
        email: null,
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found and no companyId provided to create one" },
        { status: 404 }
      );
    }

    // Default to flow1 for backwards compatibility
    const targetFlowId: FlowId = (flowId as FlowId) || "flow1";

    // Update flow config if provided (isActive, triggerProductId, upsellProductId, downsellProductId)
    // Only include fields that are explicitly provided (not undefined)
    if (flowConfig) {
      const flowUpdates: Record<string, unknown> = {};
      if (flowConfig.isActive !== undefined) flowUpdates.isActive = flowConfig.isActive;
      if (flowConfig.triggerProductId !== undefined) flowUpdates.triggerProductId = flowConfig.triggerProductId;
      if (flowConfig.upsellProductId !== undefined) flowUpdates.upsellProductId = flowConfig.upsellProductId;
      if (flowConfig.downsellProductId !== undefined) flowUpdates.downsellProductId = flowConfig.downsellProductId;

      if (Object.keys(flowUpdates).length > 0) {
        await updateFlow(user.id, targetFlowId, flowUpdates);
      }

      // Add upsell/downsell products to syncedProductIds (NOT trigger - that's sold on Whop, not through Stacker)
      const productsToSync: string[] = [];
      if (flowConfig.upsellProductId) productsToSync.push(flowConfig.upsellProductId);
      if (flowConfig.downsellProductId) productsToSync.push(flowConfig.downsellProductId);

      if (productsToSync.length > 0) {
        await addSyncedProducts(user.id, productsToSync);
      }
    }

    // Update upsell settings if provided
    if (upsellSettings) {
      await updateFlowOfferSettings(user.id, targetFlowId, "upsell", upsellSettings as Partial<OfferPageSettings>);
    }

    // Update downsell settings if provided
    if (downsellSettings) {
      await updateFlowOfferSettings(user.id, targetFlowId, "downsell", downsellSettings as Partial<OfferPageSettings>);
    }

    // Update notification settings if provided
    if (notificationSettings) {
      await updateFlowNotificationSettings(user.id, targetFlowId, notificationSettings);
    }

    // Update hidden products if provided (not flow-specific)
    if (hiddenProductIds !== undefined) {
      await updateHiddenProducts(user.id, hiddenProductIds as string[]);
    }

    // Sync storefront products (visible products eligible for 5% fee)
    if (storefrontProductIds && Array.isArray(storefrontProductIds) && storefrontProductIds.length > 0) {
      await addSyncedProducts(user.id, storefrontProductIds as string[]);
    }

    return NextResponse.json({
      success: true,
      message: "Settings saved successfully",
    });
  } catch (error) {
    console.error("Save flow settings error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
