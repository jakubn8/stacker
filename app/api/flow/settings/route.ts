import { NextRequest, NextResponse } from "next/server";
import {
  getUserByWhopUserId,
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
 * GET /api/flow/settings?whopUserId=xxx
 * Returns flow config and offer settings for a user
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    let whopUserId = searchParams.get("whopUserId");

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

    const user = await getUserByWhopUserId(whopUserId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
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
 * Body: { whopUserId, flowConfig?, upsellSettings?, downsellSettings? }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    let { whopUserId, flowConfig, upsellSettings, downsellSettings } = body;

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

    const user = await getUserByWhopUserId(whopUserId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
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
