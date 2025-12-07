"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Billing Success Content
 * Shows success message and redirects to Whop app (which loads Stacker in iframe with auth)
 */
export default function BillingSuccessContent() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get("companyId");
  const [countdown, setCountdown] = useState(3);
  const [redirecting, setRedirecting] = useState(false);

  // Whop app URL that will load Stacker in the iframe with proper auth
  // Format: https://whop.com/hub/{company_id}/apps/{app_id}
  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID || "app_stacker";
  const whopAppUrl = companyId
    ? `https://whop.com/hub/${companyId}/admin/apps/${appId}`
    : "https://whop.com/hub";

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setRedirecting(true);
          // Redirect to Whop app page (loads Stacker with auth)
          window.location.href = whopAppUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [whopAppUrl]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-md text-center">
        {/* Success Icon */}
        <div className="h-16 w-16 bg-green-500/10 rounded-full mx-auto flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-white mb-2">
          Payment Method Connected!
        </h1>
        <p className="text-zinc-400 text-sm mb-6">
          Your payment method has been successfully saved. You can now activate upsells.
        </p>

        <div className="space-y-3">
          {redirecting ? (
            <div className="flex items-center justify-center gap-2 text-zinc-400">
              <div className="h-4 w-4 border-2 border-zinc-600 border-t-green-500 rounded-full animate-spin"></div>
              <span>Redirecting to dashboard...</span>
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">
              Redirecting in {countdown} seconds...
            </p>
          )}

          <a
            href={whopAppUrl}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
          >
            Go to Dashboard Now
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
