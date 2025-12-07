"use client";

import { useState } from "react";

// Sample data to preview the cards
const sampleUpsell = {
  headline: "Wait! Your order isn't complete...",
  subheadline: "Add this exclusive offer to your purchase",
  buttonText: "Yes, Upgrade My Order",
  bulletPoints: [
    "Position sizing calculator included",
    "Stop-loss strategy templates",
    "Lifetime access to updates",
  ],
  showSocialProof: true,
  reviewText: "Saved my account! This protocol helped me avoid blowing up during the recent market crash. Worth every penny.",
  reviewAuthor: "@TradingPro",
  reviewStars: 5,
  product: {
    name: "Advanced Risk Management Protocol",
    description: "Master the art of protecting your capital with proven risk management strategies.",
    imageUrl: null,
  },
  plan: {
    price: 97,
    isRecurring: false,
    billingPeriod: null,
  },
};

const sampleDownsell = {
  headline: "Before you go...",
  subheadline: "Here's a special offer just for you",
  buttonText: "Yes, I Want This Deal",
  bulletPoints: [
    "Quick start guide included",
    "Email support for 30 days",
    "Instant digital delivery",
  ],
  showSocialProof: true,
  reviewText: "Great value for the price! Exactly what I needed to get started.",
  reviewAuthor: "@NewTrader",
  reviewStars: 5,
  product: {
    name: "Trading Basics Bundle",
    description: "Everything you need to start trading with confidence.",
    imageUrl: null,
  },
  plan: {
    price: 27,
    isRecurring: false,
    billingPeriod: null,
  },
};

export default function PreviewTestPage() {
  const [currentOffer, setCurrentOffer] = useState<"upsell" | "downsell">("upsell");
  const isUpsell = currentOffer === "upsell";
  const activeOffer = isUpsell ? sampleUpsell : sampleDownsell;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/30 via-zinc-950 to-green-900/20 flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Toggle for testing - this won't be in production */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-zinc-800 p-2 rounded-full">
        <button
          onClick={() => setCurrentOffer("upsell")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            isUpsell ? "bg-green-500 text-white" : "text-zinc-400 hover:text-white"
          }`}
        >
          Upsell
        </button>
        <button
          onClick={() => setCurrentOffer("downsell")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            !isUpsell ? "bg-orange-500 text-white" : "text-zinc-400 hover:text-white"
          }`}
        >
          Downsell
        </button>
      </div>

      {/* Responsive Offer Card - EXACT same code as /experience/offer/page.tsx */}
      {isUpsell ? (
        /* UPSELL CARD - Green theme */
        <div className="w-full max-w-[360px] sm:max-w-[400px] bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header Badge */}
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-zinc-800 px-4 py-2.5 sm:px-5 sm:py-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <p className="text-green-400 text-xs sm:text-sm font-medium">Limited Time Offer</p>
            </div>
          </div>

          <div className="p-4 sm:p-5 md:p-6">
            {/* Header */}
            <div className="text-center mb-4">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight">
                {activeOffer.headline}
              </h1>
              <p className="text-zinc-400 mt-1.5 text-xs sm:text-sm">
                {activeOffer.subheadline}
              </p>
            </div>

            {/* Product Display */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-3 sm:p-4 mb-4">
              <div className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  {activeOffer.product.imageUrl ? (
                    <img
                      src={activeOffer.product.imageUrl}
                      alt={activeOffer.product.name}
                      className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl object-cover border border-zinc-700"
                    />
                  ) : (
                    <div className="h-16 w-16 sm:h-20 sm:w-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-zinc-700">
                      <svg className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm sm:text-base font-semibold text-white">{activeOffer.product.name}</h2>
                  {activeOffer.product.description && (
                    <p className="text-zinc-400 text-xs sm:text-sm mt-0.5 line-clamp-2">{activeOffer.product.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg sm:text-xl font-bold text-green-500">
                      {formatPrice(activeOffer.plan.price)}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full ${
                      activeOffer.plan.isRecurring ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"
                    }`}>
                      {activeOffer.plan.isRecurring ? (
                        <>
                          <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {activeOffer.plan.billingPeriod || "Recurring"}
                        </>
                      ) : (
                        <>
                          <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          One Time Purchase
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits List */}
            {activeOffer.bulletPoints.length > 0 && (
              <div className="space-y-2 mb-4">
                {activeOffer.bulletPoints.map((bullet, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-zinc-300 text-xs sm:text-sm">{bullet}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Social Proof */}
            {activeOffer.showSocialProof && (
              <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-3 sm:p-4 mb-4">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-xs sm:text-sm">
                      {activeOffer.reviewAuthor ? activeOffer.reviewAuthor.charAt(0).toUpperCase() : "U"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-0.5 text-yellow-400 text-xs sm:text-sm">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < activeOffer.reviewStars ? "text-yellow-400" : "text-zinc-600"}>★</span>
                      ))}
                    </div>
                    <p className="text-zinc-300 text-xs sm:text-sm mt-1 italic leading-relaxed">
                      &ldquo;{activeOffer.reviewText}&rdquo;
                    </p>
                    <p className="text-zinc-500 text-[10px] sm:text-xs mt-1">{activeOffer.reviewAuthor}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <button className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 sm:py-4 px-4 rounded-xl transition-colors cursor-pointer">
                <span className="flex flex-col items-center">
                  <span className="text-sm sm:text-base">{activeOffer.buttonText}</span>
                  <span className="text-[10px] sm:text-xs text-green-200/70 font-normal">One-Click Charge</span>
                </span>
              </button>
              <div className="text-center">
                <button className="text-zinc-500 hover:text-zinc-400 text-xs sm:text-sm cursor-pointer">
                  No thanks, I&apos;ll skip this offer
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* DOWNSELL CARD - Orange theme */
        <div className="w-full max-w-[360px] sm:max-w-[400px] bg-zinc-900/90 backdrop-blur-xl border border-orange-500/30 rounded-2xl shadow-2xl overflow-hidden">
          {/* Urgent Header */}
          <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 px-4 py-2.5 sm:px-5 sm:py-3 text-center">
            <p className="text-orange-400 text-xs sm:text-sm font-semibold uppercase tracking-wider">Last Chance Offer</p>
          </div>

          <div className="p-4 sm:p-5 md:p-6">
            {/* Headline */}
            <div className="text-center mb-4">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight">
                {activeOffer.headline}
              </h1>
              <p className="text-zinc-500 mt-1.5 text-xs sm:text-sm">
                {activeOffer.subheadline}
              </p>
            </div>

            {/* Product Display */}
            <div className="bg-zinc-800/50 border border-orange-500/20 rounded-xl p-3 sm:p-4 mb-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  {activeOffer.product.imageUrl ? (
                    <img
                      src={activeOffer.product.imageUrl}
                      alt={activeOffer.product.name}
                      className="h-14 w-14 sm:h-18 sm:w-18 rounded-xl object-cover border border-orange-500/30"
                    />
                  ) : (
                    <div className="h-14 w-14 sm:h-18 sm:w-18 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl flex items-center justify-center border border-orange-500/30">
                      <svg className="w-7 h-7 sm:w-9 sm:h-9 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm sm:text-base font-semibold text-white">{activeOffer.product.name}</h2>
                  {activeOffer.product.description && (
                    <p className="text-zinc-400 text-xs sm:text-sm mt-0.5 line-clamp-2">{activeOffer.product.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xl sm:text-2xl font-bold text-orange-400">
                      {formatPrice(activeOffer.plan.price)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Compact Benefits - Horizontal pills */}
            {activeOffer.bulletPoints.length > 0 && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center mb-4">
                {activeOffer.bulletPoints.map((bullet, index) => (
                  <span key={index} className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5">
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-zinc-300 text-[10px] sm:text-xs">{bullet}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Social Proof - Minimal inline style */}
            {activeOffer.showSocialProof && (
              <div className="text-center mb-4 py-3 border-t border-b border-zinc-800">
                <div className="flex items-center justify-center gap-0.5 text-yellow-400 text-sm sm:text-base mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={i < activeOffer.reviewStars ? "text-yellow-400" : "text-zinc-600"}>★</span>
                  ))}
                </div>
                <p className="text-zinc-400 text-xs sm:text-sm italic">
                  &ldquo;{activeOffer.reviewText}&rdquo; - {activeOffer.reviewAuthor}
                </p>
              </div>
            )}

            {/* CTA Button */}
            <button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold py-3 sm:py-4 px-4 rounded-xl transition-all cursor-pointer shadow-lg shadow-orange-500/20">
              <span className="flex flex-col items-center">
                <span className="text-sm sm:text-base">{activeOffer.buttonText}</span>
                <span className="text-[10px] sm:text-xs text-orange-100/70 font-normal">One-Click Charge</span>
              </span>
            </button>

            {/* Skip */}
            <div className="text-center mt-3">
              <button className="text-zinc-600 hover:text-zinc-500 text-xs sm:text-sm cursor-pointer">
                No thanks, continue without this
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
