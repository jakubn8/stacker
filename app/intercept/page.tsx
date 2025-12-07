"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function InterceptPage() {
  const [previewType, setPreviewType] = useState<"upsell" | "downsell">("upsell");
  const [hasDownsell, setHasDownsell] = useState(false);

  // Read hasDownsell from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("stacker_hasDownsell");
    if (stored !== null) {
      setHasDownsell(JSON.parse(stored));
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      {/* Blurred background effect */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-zinc-950 to-green-900/20 -z-10" />

      {/* Controls Row */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between gap-3">
        <Link
          href="/dashboard/demo-company/editor"
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white text-sm font-medium transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Offer Page
        </Link>

        {/* Preview Toggle */}
        <div className="relative group">
          <div className="inline-flex items-center bg-zinc-800 border border-zinc-700 rounded-lg p-1">
            <button
              onClick={() => setPreviewType("upsell")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                previewType === "upsell"
                  ? "bg-green-500 text-white"
                  : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              Upsell
            </button>
            <button
              onClick={() => hasDownsell && setPreviewType("downsell")}
              disabled={!hasDownsell}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                !hasDownsell
                  ? "text-zinc-600 cursor-not-allowed"
                  : previewType === "downsell"
                  ? "bg-orange-500 text-white cursor-pointer"
                  : "text-zinc-400 hover:text-zinc-300 cursor-pointer"
              }`}
            >
              Downsell
            </button>
          </div>
          {/* Tooltip when disabled */}
          {!hasDownsell && (
            <div className="absolute right-0 top-full mt-2 w-48 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
              <div className="absolute -top-1 right-4 w-2 h-2 bg-zinc-800 border-l border-t border-zinc-700 rotate-45"></div>
              You don&apos;t have a downsell enabled
            </div>
          )}
        </div>
      </div>

      {/* Upsell Card */}
      {previewType === "upsell" && (
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header Badge */}
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-zinc-800 px-4 py-2">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
              <p className="text-green-400 text-xs font-medium">Limited Time Offer</p>
            </div>
          </div>

          <div className="p-5">
            {/* Header */}
            <div className="text-center mb-4">
              <h1 className="text-xl font-bold text-white leading-tight">
                Wait! Your order isn&apos;t complete...
              </h1>
              <p className="text-zinc-400 mt-1.5 text-sm">
                Add this exclusive offer to your purchase
              </p>
            </div>

            {/* Product Display */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 mb-4">
              <div className="flex gap-3">
                {/* Product Image */}
                <div className="flex-shrink-0">
                  <div className="h-20 w-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center border border-zinc-700">
                    <svg
                      className="w-8 h-8 text-purple-400"
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
                  <h2 className="text-base font-semibold text-white">
                    VIP Risk Management Protocol
                  </h2>
                  <p className="text-zinc-400 text-xs mt-0.5 line-clamp-2">
                    Protect your capital with our battle-tested risk management system.
                  </p>

                  {/* Price */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-green-500">$19.00</span>
                    <span className="text-sm text-zinc-500 line-through">$99.00</span>
                    <span className="bg-green-500/10 text-green-400 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                      80% OFF
                    </span>
                  </div>
                  {/* Payment Type */}
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-400 text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                      <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Monthly Subscription
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits List */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-zinc-300 text-xs">Position sizing calculator included</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-zinc-300 text-xs">Stop-loss strategy templates</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-zinc-300 text-xs">Lifetime access to updates</p>
              </div>
            </div>

            {/* Social Proof */}
            <div className="bg-zinc-800/30 border border-zinc-800 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-xs">T</span>
                </div>
                <div>
                  <div className="flex items-center gap-0.5 text-yellow-400 text-xs">
                    {"★★★★★".split("").map((star, i) => (
                      <span key={i}>{star}</span>
                    ))}
                  </div>
                  <p className="text-zinc-300 text-xs mt-1 italic leading-relaxed">
                    &ldquo;Saved my account! This protocol helped me avoid blowing up during the recent market crash. Worth every penny.&rdquo;
                  </p>
                  <p className="text-zinc-500 text-[10px] mt-1">@TradingPro</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors cursor-pointer">
                <span className="flex flex-col items-center">
                  <span className="text-sm">Yes, Upgrade My Order</span>
                  <span className="text-[9px] text-green-200/70 font-normal">One-Click Charge</span>
                </span>
              </button>

              <div className="text-center">
                <button className="text-zinc-500 hover:text-zinc-400 text-xs cursor-pointer">
                  No thanks, I&apos;ll skip this offer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Downsell Card */}
      {previewType === "downsell" && (
        <div className="w-full max-w-md bg-zinc-900/90 backdrop-blur-xl border border-orange-500/30 rounded-2xl shadow-2xl overflow-hidden">
          {/* Urgent Header */}
          <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 px-4 py-2 text-center">
            <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider">Last Chance Offer</p>
          </div>

          <div className="p-5">
            {/* Headline */}
            <div className="text-center mb-4">
              <h1 className="text-xl font-bold text-white leading-tight">
                Before you go...
              </h1>
              <p className="text-zinc-500 mt-1.5 text-sm">
                Here&apos;s a special offer just for you
              </p>
            </div>

            {/* Product Display */}
            <div className="bg-zinc-800/50 border border-orange-500/20 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="h-16 w-16 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-lg flex items-center justify-center border border-orange-500/30">
                    <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-white">Quick Start Trading Guide</h2>
                  <p className="text-zinc-400 text-xs mt-0.5 line-clamp-2">Essential strategies to get you trading confidently.</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-orange-400">$9.00</span>
                    <span className="text-sm text-zinc-500 line-through">$49.00</span>
                    <span className="bg-orange-500/20 text-orange-400 text-[9px] font-bold px-1.5 py-0.5 rounded">82% OFF</span>
                  </div>
                  {/* Payment Type */}
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-400 text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                      <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      One Time Purchase
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits Pills */}
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              <span className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-full px-2.5 py-1">
                <svg className="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-zinc-300 text-xs">Quick start guide</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-full px-2.5 py-1">
                <svg className="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-zinc-300 text-xs">Email support</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-full px-2.5 py-1">
                <svg className="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-zinc-300 text-xs">Instant delivery</span>
              </span>
            </div>

            {/* Social Proof */}
            <div className="text-center mb-4 py-2 border-t border-b border-zinc-800">
              <div className="flex items-center justify-center gap-0.5 text-yellow-400 text-xs mb-1">
                {"★★★★★".split("").map((star, i) => (
                  <span key={i}>{star}</span>
                ))}
              </div>
              <p className="text-zinc-400 text-xs italic">&ldquo;Great value for the price!&rdquo; - @NewTrader</p>
            </div>

            {/* CTA Button */}
            <button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold py-3 px-4 rounded-lg transition-all cursor-pointer shadow-lg shadow-orange-500/20">
              <span className="flex flex-col items-center">
                <span className="text-sm">Yes, I Want This Deal</span>
                <span className="text-[9px] text-orange-100/70 font-normal">One-Click Charge</span>
              </span>
            </button>

            {/* Skip */}
            <div className="text-center mt-2">
              <button className="text-zinc-600 hover:text-zinc-500 text-xs cursor-pointer">
                No thanks, continue without this
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
