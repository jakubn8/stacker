import { headers } from "next/headers";
import { whopsdk } from "./whop-sdk";
import { getUserByWhopUserId, createUser } from "./db";

export interface AuthUser {
  whopUserId: string;
  appId: string;
  // Database user (if exists)
  dbUserId?: string;
  whopCompanyId?: string;
  email?: string | null;
}

export interface AuthResult {
  authenticated: boolean;
  user: AuthUser | null;
  error?: string;
}

/**
 * Verify the user token from request headers (for Server Components)
 * The Whop iframe passes x-whop-user-token header automatically
 */
export async function verifyAuth(): Promise<AuthResult> {
  try {
    const headersList = await headers();

    // Verify the token using Whop SDK
    const payload = await whopsdk.verifyUserToken(headersList, { dontThrow: true });

    if (!payload) {
      return {
        authenticated: false,
        user: null,
        error: "Invalid or missing user token",
      };
    }

    // Debug: log the full payload to see what's available
    console.log("Auth payload:", JSON.stringify(payload, null, 2));

    // Get user from database
    const dbUser = await getUserByWhopUserId(payload.userId);
    console.log("DB User:", dbUser ? `Found: ${dbUser.id}, companyId: ${dbUser.whopCompanyId}` : "Not found");

    return {
      authenticated: true,
      user: {
        whopUserId: payload.userId,
        appId: payload.appId,
        dbUserId: dbUser?.id,
        whopCompanyId: dbUser?.whopCompanyId,
        email: dbUser?.email,
      },
    };
  } catch (error) {
    console.error("Auth verification error:", error);
    return {
      authenticated: false,
      user: null,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}

/**
 * Verify the user token from a Request object (for API Routes)
 */
export async function verifyAuthFromRequest(request: Request): Promise<AuthResult> {
  try {
    // Get the token from headers
    const payload = await whopsdk.verifyUserToken(request, { dontThrow: true });

    if (!payload) {
      return {
        authenticated: false,
        user: null,
        error: "Invalid or missing user token",
      };
    }

    // Get user from database
    const dbUser = await getUserByWhopUserId(payload.userId);

    return {
      authenticated: true,
      user: {
        whopUserId: payload.userId,
        appId: payload.appId,
        dbUserId: dbUser?.id,
        whopCompanyId: dbUser?.whopCompanyId,
        email: dbUser?.email,
      },
    };
  } catch (error) {
    console.error("Auth verification error:", error);
    return {
      authenticated: false,
      user: null,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}

/**
 * Check if user has admin access to a company
 */
export async function checkCompanyAccess(
  whopUserId: string,
  companyId: string
): Promise<{ hasAccess: boolean; accessLevel: string | null }> {
  try {
    const response = await whopsdk.users.checkAccess(companyId, {
      id: whopUserId,
    });

    return {
      hasAccess: response.has_access,
      accessLevel: response.access_level || null,
    };
  } catch (error) {
    console.error("Access check error:", error);
    return {
      hasAccess: false,
      accessLevel: null,
    };
  }
}

/**
 * Ensure user exists in database, create if not
 * Returns the database user ID
 */
export async function ensureUserExists(data: {
  whopUserId: string;
  whopCompanyId: string;
  whopMemberId: string;
  email?: string | null;
}): Promise<string> {
  // Check if user exists
  const existingUser = await getUserByWhopUserId(data.whopUserId);

  if (existingUser) {
    return existingUser.id;
  }

  // Create new user
  const newUser = await createUser({
    whopUserId: data.whopUserId,
    whopCompanyId: data.whopCompanyId,
    whopMemberId: data.whopMemberId,
    email: data.email || null,
  });

  return newUser.id;
}

/**
 * Get the current authenticated user or throw
 * Use this in Server Components where authentication is required
 */
export async function requireAuth(): Promise<AuthUser> {
  const result = await verifyAuth();

  if (!result.authenticated || !result.user) {
    throw new Error(result.error || "Authentication required");
  }

  return result.user;
}

/**
 * Get the current authenticated user from request or throw
 * Use this in API Routes where authentication is required
 */
export async function requireAuthFromRequest(request: Request): Promise<AuthUser> {
  const result = await verifyAuthFromRequest(request);

  if (!result.authenticated || !result.user) {
    throw new Error(result.error || "Authentication required");
  }

  return result.user;
}

/**
 * Check if user is an ADMIN of a company (owner/team member)
 * Use this to protect dashboard/owner-only pages
 */
export async function requireAdminAccess(
  whopUserId: string,
  companyId: string
): Promise<boolean> {
  const { hasAccess, accessLevel } = await checkCompanyAccess(whopUserId, companyId);

  // Only allow admin access (not just customer)
  if (!hasAccess || accessLevel !== "admin") {
    return false;
  }

  return true;
}

/**
 * Check if user is a CUSTOMER (member) of a company
 * Use this for experience/member-facing pages
 */
export async function requireCustomerAccess(
  whopUserId: string,
  companyId: string
): Promise<boolean> {
  const { hasAccess, accessLevel } = await checkCompanyAccess(whopUserId, companyId);

  // Allow both admin and customer access
  if (!hasAccess || (accessLevel !== "admin" && accessLevel !== "customer")) {
    return false;
  }

  return true;
}
