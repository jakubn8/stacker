import { ReactNode } from "react";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";

/**
 * Dashboard [companyId] Layout
 *
 * Auth flow per Whop docs:
 * 1. Verify user token → get userId
 * 2. Check access with companyId → verify access_level === "admin"
 * 3. If not admin, show access denied
 */

// Access denied component
function AccessDenied() {
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
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Admin Access Required</h1>
        <p className="text-gray-600 dark:text-zinc-400 text-sm mb-4">
          Only company admins can access the Stacker dashboard.
          You need to be a team member of this company.
        </p>
      </div>
    </div>
  );
}

export default async function CompanyDashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  // Step 1: Verify the user token to get userId
  const headersList = await headers();
  const tokenResult = await whopsdk.verifyUserToken(headersList, {
    dontThrow: true,
  });

  if (!tokenResult || !tokenResult.userId) {
    // Parent layout handles auth errors
    return children;
  }

  const { userId } = tokenResult;

  // Step 2: Check user's access level for this company
  // Only call checkAccess if companyId is a valid Whop ID (biz_xxx format)
  if (companyId.startsWith("biz_")) {
    try {
      const accessResult = await whopsdk.users.checkAccess(companyId, {
        id: userId,
      });

      // Step 3: For dashboard, user must be an admin (per Whop docs)
      if (accessResult.access_level !== "admin") {
        return <AccessDenied />;
      }
    } catch (error) {
      console.error("Access check failed:", error);
      return <AccessDenied />;
    }
  }

  // User is an admin, render the dashboard
  return <>{children}</>;
}
