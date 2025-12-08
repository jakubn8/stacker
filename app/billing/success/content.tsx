"use client";

/**
 * Billing Success Content
 * Shows success message - user needs to close and re-open Stacker
 */
export default function BillingSuccessContent() {
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

        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 mb-6">
          <p className="text-zinc-300 text-sm">
            Close this window and re-open Stacker from your Whop dashboard to continue.
          </p>
        </div>

        <button
          onClick={() => window.close()}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors cursor-pointer"
        >
          Close Window
        </button>
      </div>
    </div>
  );
}
