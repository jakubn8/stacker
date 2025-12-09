import { ReactNode } from "react";
import { headers } from "next/headers";
import { whopsdk } from "@/lib/whop-sdk";

/**
 * Protected Experience Layout
 *
 * Per Whop docs - check has_access for experience pages
 * Users need a valid membership to any product connected to the experience
 */

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

export default async function ProtectedExperienceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ experienceId: string }>;
}) {
  const { experienceId } = await params;
  const tokenResult = await whopsdk.verifyUserToken(await headers(), { dontThrow: true });

  if (!tokenResult?.userId) {
    return <AccessDenied />;
  }

  // Check access per Whop docs
  const access = await whopsdk.users.checkAccess(experienceId, { id: tokenResult.userId });

  if (!access.has_access) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
