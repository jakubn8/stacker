"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface OfferProduct {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

interface OfferPlan {
  id: string;
  price: number;
  billingPeriod: string | null;
  isRecurring: boolean;
}

interface OfferSettings {
  headline: string;
  subheadline: string;
  buttonText: string;
  bulletPoints: string[];
  showSocialProof: boolean;
  reviewText: string;
  reviewAuthor: string;
  reviewStars: number;
  showDiscountPrice?: boolean;
  discountPrice?: number;
  productDescription?: string;
}

interface OfferData {
  product: OfferProduct;
  plan: OfferPlan;
  settings: OfferSettings;
}

interface OfferResponse {
  success: boolean;
  buyerUserId: string;
  companyId: string;
  upsell: OfferData;
  downsell: OfferData | null;
  redirectUrl: string;
  error?: string;
  redirect?: boolean;
}

function OfferPageContent() {
  const searchParams = useSearchParams();
  // Support both old token format and new short offer ID
  const token = searchParams.get("token");
  const offerId = searchParams.get("offer");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offerData, setOfferData] = useState<OfferResponse | null>(null);
  const [currentOffer, setCurrentOffer] = useState<"upsell" | "downsell">("upsell");
  const [processing, setProcessing] = useState(false);

  // Fetch offer data on mount
  useEffect(() => {
    // Support both token and offer ID
    if (!token && !offerId) {
      setError("Invalid link - no offer ID provided");
      setLoading(false);
      return;
    }

    const fetchOfferData = async () => {
      try {
        // Build URL with either token or offer ID
        const queryParam = offerId
          ? `offer=${encodeURIComponent(offerId)}`
          : `token=${encodeURIComponent(token!)}`;
        const response = await fetch(`/api/offer/data?${queryParam}`);
        const data = await response.json();

        if (!response.ok) {
          if (data.redirect) {
            window.location.href = data.redirectUrl || "https://whop.com";
            return;
          }
          throw new Error(data.error || "Failed to load offer");
        }

        setOfferData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load offer");
      } finally {
        setLoading(false);
      }
    };

    fetchOfferData();
  }, [token, offerId]);

  // Handle accept offer
  const handleAccept = async () => {
    if (!offerData || (!token && !offerId)) return;

    setProcessing(true);
    try {
      const response = await fetch("/api/offer/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Support both token and offer ID
          ...(offerId ? { offerId } : { token }),
          offerType: currentOffer,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process offer");
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process offer");
      setProcessing(false);
    }
  };

  // Handle decline offer
  const handleDecline = () => {
    if (!offerData) return;

    if (currentOffer === "upsell" && offerData.downsell) {
      setCurrentOffer("downsell");
      return;
    }

    window.location.href = offerData.redirectUrl;
  };

  // Get current offer data
  const activeOffer = offerData
    ? currentOffer === "upsell"
      ? offerData.upsell
      : offerData.downsell
    : null;

  const isUpsell = currentOffer === "upsell";

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-gray-300 dark:border-zinc-700 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Something went wrong</h2>
          <p className="text-gray-500 dark:text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!activeOffer) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-gray-500 dark:text-zinc-400">No offer available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/30 via-zinc-950 to-green-900/20 flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Responsive Offer Card */}
      {isUpsell ? (
        /* UPSELL CARD - Green theme */
        <div className="w-full max-w-[360px] sm:max-w-[400px] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header Badge */}
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-gray-200 dark:border-zinc-800 px-4 py-2.5 sm:px-5 sm:py-3">
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
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                {activeOffer.settings.headline}
              </h1>
              <p className="text-gray-500 dark:text-zinc-400 mt-1.5 text-xs sm:text-sm">
                {activeOffer.settings.subheadline}
              </p>
            </div>

            {/* Product Display */}
            <div className="bg-gray-100/50 dark:bg-gray-100 dark:bg-zinc-800/50 border border-gray-300 dark:border-zinc-700 rounded-xl p-3 sm:p-4 mb-4">
              <div className="space-y-2">
                {/* Product Image */}
                {activeOffer.product.imageUrl ? (
                  <img
                    src={activeOffer.product.imageUrl}
                    alt={activeOffer.product.name}
                    className="w-full aspect-video rounded-xl object-cover border border-gray-300 dark:border-zinc-700"
                  />
                ) : (
                  <div className="w-full aspect-video bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-gray-300 dark:border-zinc-700">
                    <svg className="w-10 h-10 sm:w-12 sm:h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
                {/* Product Info */}
                <div className="pt-1">
                  <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{activeOffer.product.name}</h2>
                  {activeOffer.settings.productDescription && (
                    <p className="text-gray-500 dark:text-zinc-400 text-xs sm:text-sm mt-0.5 line-clamp-3">{activeOffer.settings.productDescription}</p>
                  )}
                </div>
                {/* Price and Billing */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {activeOffer.settings.showDiscountPrice && activeOffer.settings.discountPrice && activeOffer.settings.discountPrice > 0 && (
                      <span className="text-sm sm:text-base text-gray-400 dark:text-zinc-500 line-through">
                        {formatPrice(activeOffer.settings.discountPrice)}
                      </span>
                    )}
                    <span className="text-lg sm:text-xl font-bold text-green-500">
                      {formatPrice(activeOffer.plan.price)}
                    </span>
                  </div>
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
                        One Time
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Benefits List */}
            {activeOffer.settings.bulletPoints.length > 0 && (
              <div className="space-y-2 mb-4">
                {activeOffer.settings.bulletPoints.map((bullet, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-gray-600 dark:text-zinc-300 text-xs sm:text-sm">{bullet}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Social Proof */}
            {activeOffer.settings.showSocialProof && (
              <div className="bg-gray-100/30 dark:bg-gray-100 dark:bg-zinc-800/30 border border-gray-200 dark:border-zinc-800 rounded-xl p-3 sm:p-4 mb-4">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-900 dark:text-white font-semibold text-xs sm:text-sm">
                      {activeOffer.settings.reviewAuthor ? activeOffer.settings.reviewAuthor.charAt(0).toUpperCase() : "U"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-0.5 text-yellow-400 text-xs sm:text-sm">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < activeOffer.settings.reviewStars ? "text-yellow-400" : "text-gray-400 dark:text-zinc-600"}>★</span>
                      ))}
                    </div>
                    <p className="text-gray-600 dark:text-zinc-300 text-xs sm:text-sm mt-1 italic leading-relaxed">
                      &ldquo;{activeOffer.settings.reviewText}&rdquo;
                    </p>
                    <p className="text-gray-400 dark:text-zinc-500 text-[10px] sm:text-xs mt-1">{activeOffer.settings.reviewAuthor}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleAccept}
                disabled={processing}
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-gray-900 dark:text-white font-semibold py-3 sm:py-4 px-4 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <span className="flex flex-col items-center">
                  {processing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <>
                      <span className="text-sm sm:text-base">{activeOffer.settings.buttonText}</span>
                      <span className="text-[10px] sm:text-xs text-green-200/70 font-normal">One-Click Charge</span>
                    </>
                  )}
                </span>
              </button>
              <div className="text-center">
                <button
                  onClick={handleDecline}
                  disabled={processing}
                  className="text-gray-400 dark:text-zinc-500 hover:text-gray-500 dark:text-zinc-400 text-xs sm:text-sm cursor-pointer disabled:opacity-50"
                >
                  No thanks, I&apos;ll skip this offer
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* DOWNSELL CARD - Orange theme */
        <div className="w-full max-w-[360px] sm:max-w-[400px] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-orange-500/30 rounded-2xl shadow-2xl overflow-hidden">
          {/* Urgent Header */}
          <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 px-4 py-2.5 sm:px-5 sm:py-3 text-center">
            <p className="text-orange-400 text-xs sm:text-sm font-semibold uppercase tracking-wider">Last Chance Offer</p>
          </div>

          <div className="p-4 sm:p-5 md:p-6">
            {/* Headline */}
            <div className="text-center mb-4">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                {activeOffer.settings.headline}
              </h1>
              <p className="text-gray-400 dark:text-zinc-500 mt-1.5 text-xs sm:text-sm">
                {activeOffer.settings.subheadline}
              </p>
            </div>

            {/* Product Display */}
            <div className="bg-gray-100/50 dark:bg-gray-100 dark:bg-zinc-800/50 border border-orange-500/20 rounded-xl p-3 sm:p-4 mb-4">
              <div className="space-y-2">
                {/* Product Image */}
                {activeOffer.product.imageUrl ? (
                  <img
                    src={activeOffer.product.imageUrl}
                    alt={activeOffer.product.name}
                    className="w-full aspect-video rounded-xl object-cover border border-orange-500/30"
                  />
                ) : (
                  <div className="w-full aspect-video bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl flex items-center justify-center border border-orange-500/30">
                    <svg className="w-9 h-9 sm:w-11 sm:h-11 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
                {/* Product Info */}
                <div className="pt-1">
                  <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{activeOffer.product.name}</h2>
                  {activeOffer.settings.productDescription && (
                    <p className="text-gray-500 dark:text-zinc-400 text-xs sm:text-sm mt-0.5 line-clamp-3">{activeOffer.settings.productDescription}</p>
                  )}
                </div>
                {/* Price */}
                <div className="flex items-center gap-2">
                  {activeOffer.settings.showDiscountPrice && activeOffer.settings.discountPrice && activeOffer.settings.discountPrice > 0 && (
                    <span className="text-base sm:text-lg text-gray-400 dark:text-zinc-500 line-through">
                      {formatPrice(activeOffer.settings.discountPrice)}
                    </span>
                  )}
                  <span className="text-xl sm:text-2xl font-bold text-orange-400">
                    {formatPrice(activeOffer.plan.price)}
                  </span>
                </div>
              </div>
            </div>

            {/* Compact Benefits - Horizontal pills */}
            {activeOffer.settings.bulletPoints.length > 0 && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center mb-4">
                {activeOffer.settings.bulletPoints.map((bullet, index) => (
                  <span key={index} className="inline-flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5">
                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-600 dark:text-zinc-300 text-[10px] sm:text-xs">{bullet}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Social Proof - Minimal inline style */}
            {activeOffer.settings.showSocialProof && (
              <div className="text-center mb-4 py-3 border-t border-b border-gray-200 dark:border-zinc-800">
                <div className="flex items-center justify-center gap-0.5 text-yellow-400 text-sm sm:text-base mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={i < activeOffer.settings.reviewStars ? "text-yellow-400" : "text-gray-400 dark:text-zinc-600"}>★</span>
                  ))}
                </div>
                <p className="text-gray-500 dark:text-zinc-400 text-xs sm:text-sm italic">
                  &ldquo;{activeOffer.settings.reviewText}&rdquo; - {activeOffer.settings.reviewAuthor}
                </p>
              </div>
            )}

            {/* CTA Button */}
            <button
              onClick={handleAccept}
              disabled={processing}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 disabled:opacity-50 text-gray-900 dark:text-white font-bold py-3 sm:py-4 px-4 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
            >
              <span className="flex flex-col items-center">
                {processing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  <>
                    <span className="text-sm sm:text-base">{activeOffer.settings.buttonText}</span>
                    <span className="text-[10px] sm:text-xs text-orange-100/70 font-normal">One-Click Charge</span>
                  </>
                )}
              </span>
            </button>

            {/* Skip */}
            <div className="text-center mt-3">
              <button
                onClick={handleDecline}
                disabled={processing}
                className="text-gray-400 dark:text-zinc-600 hover:text-gray-400 dark:text-zinc-500 text-xs sm:text-sm cursor-pointer disabled:opacity-50"
              >
                No thanks, continue without this
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OfferPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center">
          <div className="h-10 w-10 border-2 border-gray-300 dark:border-zinc-700 border-t-green-500 rounded-full animate-spin"></div>
        </div>
      }
    >
      <OfferPageContent />
    </Suspense>
  );
}
