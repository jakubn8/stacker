import { ReactNode } from "react";
import { headers } from "next/headers";
import { verifyAuth, checkCompanyAccess, ensureUserExists } from "@/lib/auth";
import { AuthProvider, AuthContextUser } from "@/lib/auth-context";

// Error component for unauthenticated users
function AuthError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-md text-center">
        <div className="h-16 w-16 bg-red-500/10 rounded-full mx-auto flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-white mb-2">
          Authentication Required
        </h1>
        <p className="text-zinc-400 text-sm mb-4">{message}</p>
        <p className="text-zinc-500 text-xs">
          Please access this app through the Whop dashboard.
        </p>
      </div>
    </div>
  );
}

// Access denied component
function AccessDenied() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-md text-center">
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
        <h1 className="text-xl font-semibold text-white mb-2">Access Denied</h1>
        <p className="text-zinc-400 text-sm mb-4">
          You don&apos;t have admin access to this company. Only company admins
          can configure Stacker.
        </p>
      </div>
    </div>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Verify authentication first - try to get real user
  const authResult = await verifyAuth();

  // If authenticated with real user, use that
  if (authResult.authenticated && authResult.user) {
    const { whopUserId, dbUserId, whopCompanyId } = authResult.user;

    // Try to get company ID from URL path if not in DB
    // URL format: /dashboard/[companyId]/... where companyId could be biz_xxx or exp_xxx
    let companyId = whopCompanyId;
    const email = authResult.user.email;

    if (!companyId) {
      // Extract company ID from the URL path
      const headersList = await headers();
      const pathname = headersList.get("x-pathname") || headersList.get("x-invoke-path") || "";

      // Try to extract biz_xxx or company ID from path: /dashboard/biz_xxx/...
      const pathMatch = pathname.match(/\/dashboard\/([^\/]+)/);
      if (pathMatch && pathMatch[1]) {
        const pathCompanyId = pathMatch[1];
        // Only use if it looks like a real company ID (biz_xxx)
        if (pathCompanyId.startsWith("biz_")) {
          companyId = pathCompanyId;
        }
      }

      // If still no company ID, try referer header
      if (!companyId) {
        const referer = headersList.get("referer") || "";
        const refererMatch = referer.match(/\/dashboard\/(biz_[^\/]+)/);
        if (refererMatch && refererMatch[1]) {
          companyId = refererMatch[1];
        }
      }
    }

    // Build auth context user
    const contextUser: AuthContextUser = {
      whopUserId,
      dbUserId: dbUserId || null,
      whopCompanyId: companyId || "",
      email: email || null,
      isAdmin: true, // Will be verified per-company in the page
    };

    return <AuthProvider user={contextUser}>{children}</AuthProvider>;
  }

  // No authentication available
  return <AuthError message={authResult.error || "Please sign in to continue"} />;
}
