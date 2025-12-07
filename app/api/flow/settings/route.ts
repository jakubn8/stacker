import { NextRequest, NextResponse } from "next/server";
import {
  getUserByWhopUserId,
  createUser,
  getOfferSettings,
  updateOfferSettings,
  updateFlowConfig,
  getNotificationSettings,
  type OfferPageSettings,
  type FlowConfig,
} from "@/lib/db";
import { verifyAuthFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/flow/settings?whopUserId=xxx&companyId=biz_xxx
 * Returns flow config and offer settings for a user
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
      user = await createUser({
        whopUserId,
        whopCompanyId: companyId,
        email: null,
      });
    }

    if (!user) {
      // Return empty defaults if no companyId provided to create user
      return NextResponse.json({
        success: true,
        flowConfig: null,
        offerSettings: null,
        notificationSettings: null,
      });
    }

    const offerSettings = await getOfferSettings(user.id);
    const notificationSettings = await getNotificationSettings(user.id);

    return NextResponse.json({
      success: true,
      flowConfig: user.flowConfig,
      offerSettings,
      notificationSettings,
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
 * Body: { whopUserId, companyId?, flowConfig?, upsellSettings?, downsellSettings? }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    let { whopUserId, companyId, flowConfig, upsellSettings, downsellSettings } = body;

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

    // Update flow config if provided
    if (flowConfig) {
      await updateFlowConfig(user.id, flowConfig as Partial<FlowConfig>);
    }

    // Update upsell settings if provided
    if (upsellSettings) {
      await updateOfferSettings(user.id, "upsell", upsellSettings as Partial<OfferPageSettings>);
    }

    // Update downsell settings if provided
    if (downsellSettings) {
      await updateOfferSettings(user.id, "downsell", downsellSettings as Partial<OfferPageSettings>);
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
