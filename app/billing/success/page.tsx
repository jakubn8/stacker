"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Billing Success Page
 * This page is shown after a user connects their payment method via Whop checkout.
 * Since the redirect happens outside the Whop iframe, there's no auth token.
 * We show a success message and tell the user to return to Whop.
 */
export default function BillingSuccessPage() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get("companyId");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Try to close the window (works if opened by JavaScript)
          window.close();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
          Your payment method has been successfully saved. You can now activate upsells in Stacker.
        </p>

        <div className="space-y-3">
          <p className="text-zinc-500 text-xs">
            Return to Whop to continue using Stacker.
          </p>

          {countdown > 0 && (
            <p className="text-zinc-600 text-xs">
              This window will close in {countdown} seconds...
            </p>
          )}

          <a
            href="https://whop.com/hub"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
          >
            Return to Whop
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
