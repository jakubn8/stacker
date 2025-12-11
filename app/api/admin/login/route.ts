import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const ADMIN_COOKIE_NAME = "stacker_admin_session";
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * POST /api/admin/login
 * Verify admin password and set session cookie
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { password } = body;

    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { error: "Admin access not configured" },
        { status: 500 }
      );
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Create a simple session token (hash of password + timestamp)
    const sessionToken = Buffer.from(
      `${adminPassword}:${Date.now() + SESSION_DURATION}`
    ).toString("base64");

    // Set HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION / 1000, // in seconds
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/login
 * Logout - clear session cookie
 */
export async function DELETE(): Promise<NextResponse> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  return NextResponse.json({ success: true });
}

/**
 * GET /api/admin/login
 * Check if user is authenticated
 */
export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    // Decode and verify the session token
    const decoded = Buffer.from(sessionCookie.value, "base64").toString();
    const [password, expiresAt] = decoded.split(":");

    const adminPassword = process.env.ADMIN_PASSWORD;

    if (password !== adminPassword) {
      return NextResponse.json({ authenticated: false });
    }

    if (Date.now() > parseInt(expiresAt)) {
      // Session expired
      const cookieStore = await cookies();
      cookieStore.delete(ADMIN_COOKIE_NAME);
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
