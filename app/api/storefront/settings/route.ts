import { NextRequest, NextResponse } from "next/server";
import { verifyAuthFromRequest } from "@/lib/auth";
import {
  getUserByWhopUserId,
  getStorefrontSettings,
  updateStorefrontSettings,
  DEFAULT_STOREFRONT_SETTINGS,
  StorefrontSettings,
} from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/storefront/settings?whopUserId=xxx&companyId=xxx
 * Fetches storefront settings for a company
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const whopUserId = searchParams.get("whopUserId");
    const companyId = searchParams.get("companyId");

    if (!whopUserId || !companyId) {
      return NextResponse.json(
        { error: "whopUserId and companyId are required" },
        { status: 400 }
      );
    }

    // Get user by Whop user ID
    const user = await getUserByWhopUserId(whopUserId);
    if (!user) {
      // Return defaults if user not found
      return NextResponse.json({
        success: true,
        settings: DEFAULT_STOREFRONT_SETTINGS,
      });
    }

    // Verify user has access to this company
    if (user.whopCompanyId !== companyId) {
      return NextResponse.json(
        { error: "Not authorized to access this company's settings" },
        { status: 403 }
      );
    }

    const settings = await getStorefrontSettings(user.id);

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Failed to get storefront settings:", error);
    return NextResponse.json(
      { error: "Failed to get storefront settings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/storefront/settings
 * Updates storefront settings for a company
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { whopUserId, companyId, settings } = body as {
      whopUserId: string;
      companyId: string;
      settings: Partial<StorefrontSettings>;
    };

    if (!whopUserId || !companyId) {
      return NextResponse.json(
        { error: "whopUserId and companyId are required" },
        { status: 400 }
      );
    }

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { error: "settings object is required" },
        { status: 400 }
      );
    }

    // Get user by Whop user ID
    const user = await getUserByWhopUserId(whopUserId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Verify user has access to this company
    if (user.whopCompanyId !== companyId) {
      return NextResponse.json(
        { error: "Not authorized to update this company's settings" },
        { status: 403 }
      );
    }

    // Validate settings
    const validSettings: Partial<StorefrontSettings> = {};

    if (settings.title !== undefined) {
      validSettings.title = String(settings.title).slice(0, 100);
    }
    if (settings.subtitle !== undefined) {
      validSettings.subtitle = String(settings.subtitle).slice(0, 200);
    }
    if (settings.accentColor !== undefined) {
      // Validate hex color
      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (hexRegex.test(settings.accentColor)) {
        validSettings.accentColor = settings.accentColor;
      }
    }
    if (settings.buttonText !== undefined) {
      validSettings.buttonText = String(settings.buttonText).slice(0, 30);
    }
    if (settings.columns !== undefined) {
      const cols = Number(settings.columns);
      if ([1, 2, 3].includes(cols)) {
        validSettings.columns = cols as 1 | 2 | 3;
      }
    }
    if (settings.emptyMessage !== undefined) {
      validSettings.emptyMessage = String(settings.emptyMessage).slice(0, 200);
    }

    await updateStorefrontSettings(user.id, validSettings);

    // Return updated settings
    const updatedSettings = await getStorefrontSettings(user.id);

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
    });
  } catch (error) {
    console.error("Failed to update storefront settings:", error);
    return NextResponse.json(
      { error: "Failed to update storefront settings" },
      { status: 500 }
    );
  }
}
