import { NextRequest, NextResponse } from "next/server";
import {
  getUserByWhopUserId,
  getAnalytics,
  checkAndResetWeeklyAnalyticsIfNeeded,
} from "@/lib/db";
import { verifyAuthFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics?whopUserId=xxx
 * Returns analytics data for a user (views, conversions, conversion rate)
 *
 * Authentication: Verifies x-whop-user-token header when available.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    let whopUserId = searchParams.get("whopUserId");

    // Try to verify authentication from token
    const authResult = await verifyAuthFromRequest(request);

    if (authResult.authenticated && authResult.user) {
      // Use authenticated user ID (more secure)
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

    // Check if weekly analytics need to be reset
    await checkAndResetWeeklyAnalyticsIfNeeded(user.id);

    // Get analytics data
    const analytics = await getAnalytics(user.id);
    if (!analytics) {
      return NextResponse.json(
        { error: "Failed to fetch analytics" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analytics: {
        totalViews: analytics.totalViews,
        totalConversions: analytics.totalConversions,
        conversionRate: analytics.conversionRate,
        weeklyViews: analytics.weeklyViews,
        weeklyConversions: analytics.weeklyConversions,
        weeklyRevenue: analytics.weeklyRevenue,
        totalRevenue: analytics.totalRevenue,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
