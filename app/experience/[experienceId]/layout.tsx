import { ReactNode } from "react";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";

/**
 * Experience [experienceId] Layout
 *
 * Auth flow per Whop docs:
 * 1. Verify user token → get userId
 * 2. Check access with experienceId → verify has_access is true
 * 3. If no access, show access denied
 */

// Access denied component
function AccessDenied() {
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
        <h1 className="text-xl font-semibold text-white mb-2">Access Denied</h1>
        <p className="text-zinc-400 text-sm mb-4">
          You don&apos;t have access to this experience.
          Please purchase a membership to access this content.
        </p>
      </div>
    </div>
  );
}

// Auth error component
function AuthError() {
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
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-white mb-2">Authentication Required</h1>
        <p className="text-zinc-400 text-sm mb-4">
          Please sign in to access this experience.
        </p>
      </div>
    </div>
  );
}

export default async function ExperienceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ experienceId: string }>;
}) {
  const { experienceId } = await params;

  // Step 1: Verify the user token to get userId
  const headersList = await headers();
  const tokenResult = await whopsdk.verifyUserToken(headersList, {
    dontThrow: true,
  });

  if (!tokenResult || !tokenResult.userId) {
    return <AuthError />;
  }

  const { userId } = tokenResult;

  // Step 2: Check user's access level for this experience
  const accessResult = await whopsdk.users.checkAccess(experienceId, {
    id: userId,
  });

  // Step 3: User needs has_access to be true (customer or admin)
  if (!accessResult.has_access) {
    return <AccessDenied />;
  }

  // User has access, render the experience
  return <>{children}</>;
}
