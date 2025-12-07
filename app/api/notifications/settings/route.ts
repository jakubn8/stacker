import { NextRequest, NextResponse } from "next/server";
import { updateNotificationSettings, getUserByWhopUserId } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/settings
 * Update notification settings for a user
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { whopUserId, settings } = body;

    if (!whopUserId) {
      return NextResponse.json(
        { error: "whopUserId is required" },
        { status: 400 }
      );
    }

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { error: "settings object is required" },
        { status: 400 }
      );
    }

    // Get the user
    const user = await getUserByWhopUserId(whopUserId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update notification settings
    await updateNotificationSettings(user.id, {
      title: settings.title,
      content: settings.content,
      enabled: settings.enabled,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update notification settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
