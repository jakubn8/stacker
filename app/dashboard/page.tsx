"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";
import { getUserByWhopUserId } from "@/lib/db";

/**
 * Dashboard Entry Point
 *
 * When accessed through Whop, this page detects the company context
 * and redirects to the correct /dashboard/[companyId] route.
 */
export default async function DashboardEntryPage() {
  const headersList = await headers();

  // Try to get company ID from various sources
  let companyId: string | null = null;

  // 1. Check for x-whop-company-id header (set by Whop iframe)
  const headerCompanyId = headersList.get("x-whop-company-id");
  if (headerCompanyId && headerCompanyId.startsWith("biz_")) {
    companyId = headerCompanyId;
  }

  // 2. Try to get from user token and database
  if (!companyId) {
    try {
      const payload = await whopsdk.verifyUserToken(headersList, { dontThrow: true });

      if (payload?.userId) {
        // Check if user exists in our database with a company ID
        const dbUser = await getUserByWhopUserId(payload.userId);
        if (dbUser?.whopCompanyId && dbUser.whopCompanyId.startsWith("biz_")) {
          companyId = dbUser.whopCompanyId;
        }
      }
    } catch (error) {
      console.error("Error getting company from token:", error);
    }
  }

  // 3. Check referer for company ID
  if (!companyId) {
    const referer = headersList.get("referer") || "";
    // Look for patterns like /apps/app_xxx/biz_xxx or /dashboard/biz_xxx
    const refererMatch = referer.match(/(biz_[a-zA-Z0-9]+)/);
    if (refererMatch && refererMatch[1]) {
      companyId = refererMatch[1];
    }
  }

  // 4. Check x-whop-resource-id header (might contain company context)
  if (!companyId) {
    const resourceId = headersList.get("x-whop-resource-id");
    if (resourceId && resourceId.startsWith("biz_")) {
      companyId = resourceId;
    }
  }

  // Log all headers for debugging
  console.log("Dashboard entry - looking for company ID");
  console.log("Headers received:");
  for (const [key, value] of headersList.entries()) {
    if (key.startsWith("x-whop") || key === "referer") {
      console.log(`  ${key}: ${value}`);
    }
  }
  console.log("Resolved company ID:", companyId || "none");

  // If we found a company ID, redirect to that dashboard
  if (companyId) {
    redirect(`/dashboard/${companyId}`);
  }

  // No company ID found - show setup instructions
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-8 max-w-md text-center">
        <div className="h-16 w-16 bg-orange-500/10 rounded-full mx-auto flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-orange-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Company Not Detected
        </h1>
        <p className="text-gray-500 dark:text-zinc-400 text-sm mb-4">
          Please access this app through your Whop business dashboard.
          The app needs to be installed on a business to work properly.
        </p>
        <p className="text-gray-400 dark:text-zinc-500 text-xs">
          If you&apos;re testing in dev mode, make sure the path includes your business ID
          (e.g., /dashboard/biz_xxxxx)
        </p>
      </div>
    </div>
  );
}
