"use client";

import { Button, TextButton } from "@whop/frosted-ui";

export default function InterceptPage() {
  return (
    <div className="min-h-screen bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Blurred background effect */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-zinc-950 to-green-900/20 -z-10" />

      {/* Modal Card */}
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Badge */}
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-zinc-800 px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <p className="text-green-400 text-sm font-medium">Limited Time Offer</p>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
              Wait! Your order isn&apos;t complete...
            </h1>
            <p className="text-zinc-400 mt-2">
              Add this exclusive offer to your purchase
            </p>
          </div>

          {/* Product Display */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 mb-6">
            <div className="flex gap-4">
              {/* Product Image */}
              <div className="flex-shrink-0">
                <div className="h-24 w-24 md:h-32 md:w-32 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-zinc-700">
                  <svg
                    className="w-12 h-12 text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg md:text-xl font-semibold text-white">
                  VIP Risk Management Protocol
                </h2>
                <p className="text-zinc-400 text-sm mt-1 line-clamp-2">
                  Protect your capital with our battle-tested risk management system used by professional traders.
                </p>

                {/* Price */}
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-2xl font-bold text-green-500">$19.00</span>
                  <span className="text-lg text-zinc-500 line-through">$99.00</span>
                  <span className="bg-green-500/10 text-green-400 text-xs font-semibold px-2 py-1 rounded-full">
                    80% OFF
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits List */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-zinc-300 text-sm">Position sizing calculator included</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-zinc-300 text-sm">Stop-loss strategy templates</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-zinc-300 text-sm">Lifetime access to updates</p>
            </div>
          </div>

          {/* Social Proof */}
          <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-sm">U</span>
              </div>
              <div>
                <div className="flex items-center gap-1 text-yellow-400">
                  {"★★★★★".split("").map((star, i) => (
                    <span key={i}>{star}</span>
                  ))}
                </div>
                <p className="text-zinc-300 text-sm mt-1 italic">
                  &ldquo;Saved my account! This protocol helped me avoid blowing up during the recent market crash. Worth every penny.&rdquo;
                </p>
                <p className="text-zinc-500 text-xs mt-2">@User123</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              variant="primary"
              colorScheme="success-green"
              size="lg"
              className="w-full !py-4 !text-base font-semibold"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add to Order (One-Click)
              </span>
            </Button>

            <div className="text-center">
              <TextButton className="text-zinc-500 hover:text-zinc-400 text-sm">
                No thanks, I&apos;ll skip this offer
              </TextButton>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-zinc-800">
            <div className="flex items-center gap-1.5 text-zinc-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs">Secure Checkout</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span className="text-xs">Instant Access</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
