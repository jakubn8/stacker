"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import DashboardNav from "@/components/DashboardNav";

interface OfferSettings {
  headline: string;
  subheadline: string;
  buttonText: string;
  bulletPoints: string[];
  showSocialProof: boolean;
  reviewText: string;
  reviewAuthor: string;
  reviewStars: number;
}

interface FlowConfig {
  isActive: boolean;
  triggerProductId: string | null;
  upsellProductId: string | null;
  downsellProductId: string | null;
}

interface WhopProduct {
  id: string;
  title: string;
  description: string | null;
  headline: string | null;
  imageUrl: string | null;
  price: number;
  currency: string;
  planType: "one_time" | "renewal" | "free";
  billingPeriod: number | null;
}

export default function EditorPage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const { user: authUser } = useAuth();
  const whopUserId = authUser?.whopUserId || `demo_user_${companyId}`;
  // Use the real company ID from auth context for Whop API calls, or URL param if it's a real biz_xxx ID
  const realCompanyId = authUser?.whopCompanyId || (companyId.startsWith("biz_") ? companyId : null);

  // Loading and saving state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Product type toggle (upsell vs downsell)
  const [activeProduct, setActiveProduct] = useState<"upsell" | "downsell">("upsell");

  // Device mode toggle (desktop vs mobile)
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");

  // Products from Whop
  const [products, setProducts] = useState<WhopProduct[]>([]);

  // Flow config
  const [flowConfig, setFlowConfig] = useState<FlowConfig>({
    isActive: false,
    triggerProductId: null,
    upsellProductId: null,
    downsellProductId: null,
  });

  // Check if downsell is configured
  const hasDownsell = flowConfig.downsellProductId !== null;

  // Get selected product info
  const upsellProductData = products.find(p => p.id === flowConfig.upsellProductId);
  const downsellProductData = products.find(p => p.id === flowConfig.downsellProductId);
  const currentProductData = activeProduct === "upsell" ? upsellProductData : downsellProductData;

  // Format price helper
  const formatPrice = (price: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(price);
  };

  // Upsell product state
  const [upsellHeadline, setUpsellHeadline] = useState("Wait! Your order isn't complete...");
  const [upsellSubheadline, setUpsellSubheadline] = useState("Add this exclusive offer to your purchase");
  const [upsellButtonText, setUpsellButtonText] = useState("Yes, Upgrade My Order");
  const [upsellBullet1, setUpsellBullet1] = useState("Position sizing calculator included");
  const [upsellBullet2, setUpsellBullet2] = useState("Stop-loss strategy templates");
  const [upsellBullet3, setUpsellBullet3] = useState("Lifetime access to updates");
  const [upsellShowSocialProof, setUpsellShowSocialProof] = useState(true);
  const [upsellReviewText, setUpsellReviewText] = useState("Saved my account! This protocol helped me avoid blowing up during the recent market crash. Worth every penny.");
  const [upsellAuthorName, setUpsellAuthorName] = useState("@TradingPro");
  const [upsellStarRating, setUpsellStarRating] = useState(5);

  // Downsell product state
  const [downsellHeadline, setDownsellHeadline] = useState("Before you go...");
  const [downsellSubheadline, setDownsellSubheadline] = useState("Here's a special offer just for you");
  const [downsellButtonText, setDownsellButtonText] = useState("Yes, I Want This Deal");
  const [downsellBullet1, setDownsellBullet1] = useState("Quick start guide included");
  const [downsellBullet2, setDownsellBullet2] = useState("Email support for 30 days");
  const [downsellBullet3, setDownsellBullet3] = useState("Instant digital delivery");
  const [downsellShowSocialProof, setDownsellShowSocialProof] = useState(true);
  const [downsellReviewText, setDownsellReviewText] = useState("Great value for the price! Exactly what I needed to get started.");
  const [downsellAuthorName, setDownsellAuthorName] = useState("@NewTrader");
  const [downsellStarRating, setDownsellStarRating] = useState(5);

  // Fetch settings and products on mount
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch settings and products in parallel
      // Use realCompanyId for Whop API - only fetch products if we have a valid company ID
      const [settingsResponse, productsResponse] = await Promise.all([
        fetch(`/api/flow/settings?whopUserId=${whopUserId}&companyId=${realCompanyId || companyId}`),
        realCompanyId ? fetch(`/api/products?companyId=${realCompanyId}`) : Promise.resolve(null),
      ]);

      // Handle settings
      if (settingsResponse.ok) {
        const data = await settingsResponse.json();

        if (data.flowConfig) {
          setFlowConfig(data.flowConfig);
        }

        if (data.offerSettings?.upsell) {
          const upsell = data.offerSettings.upsell;
          setUpsellHeadline(upsell.headline);
          setUpsellSubheadline(upsell.subheadline);
          setUpsellButtonText(upsell.buttonText);
          if (upsell.bulletPoints?.length >= 1) setUpsellBullet1(upsell.bulletPoints[0] || "");
          if (upsell.bulletPoints?.length >= 2) setUpsellBullet2(upsell.bulletPoints[1] || "");
          if (upsell.bulletPoints?.length >= 3) setUpsellBullet3(upsell.bulletPoints[2] || "");
          setUpsellShowSocialProof(upsell.showSocialProof);
          setUpsellReviewText(upsell.reviewText);
          setUpsellAuthorName(upsell.reviewAuthor);
          setUpsellStarRating(upsell.reviewStars);
        }

        if (data.offerSettings?.downsell) {
          const downsell = data.offerSettings.downsell;
          setDownsellHeadline(downsell.headline);
          setDownsellSubheadline(downsell.subheadline);
          setDownsellButtonText(downsell.buttonText);
          if (downsell.bulletPoints?.length >= 1) setDownsellBullet1(downsell.bulletPoints[0] || "");
          if (downsell.bulletPoints?.length >= 2) setDownsellBullet2(downsell.bulletPoints[1] || "");
          if (downsell.bulletPoints?.length >= 3) setDownsellBullet3(downsell.bulletPoints[2] || "");
          setDownsellShowSocialProof(downsell.showSocialProof);
          setDownsellReviewText(downsell.reviewText);
          setDownsellAuthorName(downsell.reviewAuthor);
          setDownsellStarRating(downsell.reviewStars);
        }
      }

      // Handle products (only if we have a valid company ID and response)
      if (productsResponse && productsResponse.ok) {
        const productsData = await productsResponse.json();
        if (productsData.products) {
          setProducts(productsData.products);
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [whopUserId, companyId, realCompanyId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Get current product values based on active selection
  const headline = activeProduct === "upsell" ? upsellHeadline : downsellHeadline;
  const subheadline = activeProduct === "upsell" ? upsellSubheadline : downsellSubheadline;
  const buttonText = activeProduct === "upsell" ? upsellButtonText : downsellButtonText;
  const bullet1 = activeProduct === "upsell" ? upsellBullet1 : downsellBullet1;
  const bullet2 = activeProduct === "upsell" ? upsellBullet2 : downsellBullet2;
  const bullet3 = activeProduct === "upsell" ? upsellBullet3 : downsellBullet3;
  const showSocialProof = activeProduct === "upsell" ? upsellShowSocialProof : downsellShowSocialProof;
  const reviewText = activeProduct === "upsell" ? upsellReviewText : downsellReviewText;
  const authorName = activeProduct === "upsell" ? upsellAuthorName : downsellAuthorName;
  const starRating = activeProduct === "upsell" ? upsellStarRating : downsellStarRating;

  // Setters based on active product
  const setHeadline = activeProduct === "upsell" ? setUpsellHeadline : setDownsellHeadline;
  const setSubheadline = activeProduct === "upsell" ? setUpsellSubheadline : setDownsellSubheadline;
  const setButtonText = activeProduct === "upsell" ? setUpsellButtonText : setDownsellButtonText;
  const setBullet1 = activeProduct === "upsell" ? setUpsellBullet1 : setDownsellBullet1;
  const setBullet2 = activeProduct === "upsell" ? setUpsellBullet2 : setDownsellBullet2;
  const setBullet3 = activeProduct === "upsell" ? setUpsellBullet3 : setDownsellBullet3;
  const setShowSocialProof = activeProduct === "upsell" ? setUpsellShowSocialProof : setDownsellShowSocialProof;
  const setReviewText = activeProduct === "upsell" ? setUpsellReviewText : setDownsellReviewText;
  const setAuthorName = activeProduct === "upsell" ? setUpsellAuthorName : setDownsellAuthorName;
  const setStarRating = activeProduct === "upsell" ? setUpsellStarRating : setDownsellStarRating;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveMessage(null);

      const upsellSettings: OfferSettings = {
        headline: upsellHeadline,
        subheadline: upsellSubheadline,
        buttonText: upsellButtonText,
        bulletPoints: [upsellBullet1, upsellBullet2, upsellBullet3].filter(Boolean),
        showSocialProof: upsellShowSocialProof,
        reviewText: upsellReviewText,
        reviewAuthor: upsellAuthorName,
        reviewStars: upsellStarRating,
      };

      const downsellSettings: OfferSettings = {
        headline: downsellHeadline,
        subheadline: downsellSubheadline,
        buttonText: downsellButtonText,
        bulletPoints: [downsellBullet1, downsellBullet2, downsellBullet3].filter(Boolean),
        showSocialProof: downsellShowSocialProof,
        reviewText: downsellReviewText,
        reviewAuthor: downsellAuthorName,
        reviewStars: downsellStarRating,
      };

      const response = await fetch("/api/flow/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whopUserId,
          companyId: realCompanyId || companyId,
          upsellSettings,
          downsellSettings,
        }),
      });

      if (response.ok) {
        setSaveMessage({ type: "success", text: "Changes saved successfully!" });
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        const data = await response.json();
        setSaveMessage({ type: "error", text: data.error || "Failed to save changes" });
      }
    } catch (error) {
      console.error("Failed to save:", error);
      setSaveMessage({ type: "error", text: "Failed to save changes. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state while fetching settings
  if (isLoading) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 border-2 border-zinc-700 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400 text-sm">Loading editor settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      <DashboardNav companyId={companyId} />
      <div className="flex-1 flex overflow-hidden">
      {/* Left Side - Preview Canvas (70%) */}
      <div className="w-[70%] relative overflow-hidden">
        {/* Gradient background for preview window effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-zinc-950 to-green-900/20" />

        {/* Preview Label & Product Toggle */}
        <div className="absolute top-6 left-6 z-10 flex items-center gap-3">
          <div className="inline-flex items-center gap-2 bg-zinc-800/80 backdrop-blur-sm border border-zinc-700 rounded-full px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-zinc-300 text-sm font-medium">Live Preview</span>
          </div>

          {/* Product Toggle */}
          <div className="inline-flex items-center bg-zinc-800/80 backdrop-blur-sm border border-zinc-700 rounded-full p-1">
            <button
              onClick={() => setActiveProduct("upsell")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeProduct === "upsell"
                  ? "bg-green-500 text-white"
                  : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              Upsell
            </button>
            <div className="relative group">
              <button
                onClick={() => hasDownsell && setActiveProduct("downsell")}
                disabled={!hasDownsell}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  !hasDownsell
                    ? "text-zinc-600 cursor-not-allowed"
                    : activeProduct === "downsell"
                    ? "bg-orange-500 text-white cursor-pointer"
                    : "text-zinc-400 hover:text-zinc-300 cursor-pointer"
                }`}
              >
                Downsell
              </button>
              {/* Tooltip when disabled */}
              {!hasDownsell && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 border-l border-t border-zinc-700 rotate-45"></div>
                  Add a downsell product in your dashboard configuration first
                </div>
              )}
            </div>
          </div>

          {/* Device Toggle */}
          <div className="inline-flex items-center bg-zinc-800/80 backdrop-blur-sm border border-zinc-700 rounded-full p-1">
            <button
              onClick={() => setDeviceMode("desktop")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                deviceMode === "desktop"
                  ? "bg-zinc-600 text-white"
                  : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Desktop
            </button>
            <button
              onClick={() => setDeviceMode("mobile")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                deviceMode === "mobile"
                  ? "bg-zinc-600 text-white"
                  : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Mobile
            </button>
          </div>
        </div>

        {/* Centered Preview Card */}
        <div className="h-full flex items-center justify-center p-4 pt-20">
          {deviceMode === "desktop" ? (
            /* Desktop View - Browser frame */
            <div className="w-[680px] max-h-[calc(100vh-180px)] bg-zinc-900 rounded-xl shadow-2xl border border-zinc-800 overflow-hidden flex flex-col">
              {/* Browser Chrome */}
              <div className="h-7 bg-zinc-800 flex items-center px-3 gap-2 flex-shrink-0">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/80"></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-500/80"></div>
                  <div className="w-2 h-2 rounded-full bg-green-500/80"></div>
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-zinc-700 rounded px-2.5 py-0.5 text-zinc-400 text-[9px] flex items-center gap-1">
                    <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    whop.com/offer
                  </div>
                </div>
              </div>
              {/* Browser Content */}
              <div className="flex-1 bg-gradient-to-br from-purple-900/30 via-zinc-950 to-green-900/20 flex items-center justify-center overflow-y-auto p-3">
                {activeProduct === "upsell" ? (
                  /* UPSELL CARD - Desktop */
                  <div className="w-full max-w-[300px] bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl overflow-hidden scale-[0.9]">
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

                    <div className="p-4">
                      {/* Header */}
                      <div className="text-center mb-3">
                        <h1 className="text-lg font-bold text-white leading-tight">
                          {headline || "Enter a headline..."}
                        </h1>
                        <p className="text-zinc-400 mt-1 text-xs">
                          {subheadline || "Enter a sub-headline..."}
                        </p>
                      </div>

                      {/* Product Display */}
                      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-2.5 mb-3">
                        {upsellProductData ? (
                          <div className="flex gap-2.5">
                            <div className="flex-shrink-0">
                              {upsellProductData.imageUrl ? (
                                <img src={upsellProductData.imageUrl} alt={upsellProductData.title} className="h-16 w-16 rounded-lg object-cover border border-zinc-700" />
                              ) : (
                                <div className="h-16 w-16 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center border border-zinc-700">
                                  <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h2 className="text-sm font-semibold text-white">{upsellProductData.title}</h2>
                              <p className="text-zinc-400 text-[11px] mt-0.5 line-clamp-2">{upsellProductData.headline || upsellProductData.description || "No description"}</p>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="text-base font-bold text-green-500">{formatPrice(upsellProductData.price, upsellProductData.currency)}</span>
                              </div>
                              <div className="mt-1.5">
                                <span className={`inline-flex items-center gap-1 text-[8px] font-medium px-1.5 py-0.5 rounded-full ${
                                  upsellProductData.planType === "renewal" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"
                                }`}>
                                  {upsellProductData.planType === "renewal" ? (
                                    <>
                                      <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                      {upsellProductData.billingPeriod === 30 ? "Monthly" : upsellProductData.billingPeriod === 365 ? "Yearly" : "Recurring"}
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      One Time Purchase
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-zinc-500 text-sm">No upsell product selected</p>
                            <p className="text-zinc-600 text-xs mt-1">Select an upsell product in your dashboard</p>
                          </div>
                        )}
                      </div>

                      {/* Benefits List */}
                      <div className="space-y-1.5 mb-3">
                        {[bullet1, bullet2, bullet3].map((bullet, index) => (
                          bullet && (
                            <div key={index} className="flex items-center gap-1.5">
                              <div className="h-3.5 w-3.5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                <svg className="w-2 h-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <p className="text-zinc-300 text-[11px]">{bullet}</p>
                            </div>
                          )
                        ))}
                      </div>

                      {/* Social Proof */}
                      {showSocialProof && (
                        <div className="bg-zinc-800/30 border border-zinc-800 rounded-lg p-2.5 mb-3">
                          <div className="flex items-start gap-2">
                            <div className="h-7 w-7 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-semibold text-[10px]">{authorName ? authorName.charAt(0).toUpperCase() : "U"}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-0.5 text-yellow-400 text-[10px]">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <span key={i} className={i < starRating ? "text-yellow-400" : "text-zinc-600"}>★</span>
                                ))}
                              </div>
                              <p className="text-zinc-300 text-[10px] mt-0.5 italic leading-relaxed">&ldquo;{reviewText || "Enter review text..."}&rdquo;</p>
                              <p className="text-zinc-500 text-[9px] mt-0.5">{authorName || "@username"}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="space-y-1.5">
                        <button className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 px-3 rounded-lg transition-colors cursor-pointer">
                          <span className="flex flex-col items-center">
                            <span className="text-xs">{buttonText || "Enter button text..."}</span>
                            <span className="text-[9px] text-green-200/70 font-normal">One-Click Charge</span>
                          </span>
                        </button>
                        <div className="text-center">
                          <button className="text-zinc-500 hover:text-zinc-400 text-[10px] cursor-pointer">No thanks, I&apos;ll skip this offer</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* DOWNSELL CARD - Desktop */
                  <div className="w-full max-w-[280px] bg-zinc-900/90 backdrop-blur-xl border border-orange-500/30 rounded-xl shadow-2xl overflow-hidden scale-[0.9]">
                    {/* Urgent Header */}
                    <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 px-4 py-2 text-center">
                      <p className="text-orange-400 text-[10px] font-semibold uppercase tracking-wider">Last Chance Offer</p>
                    </div>

                    <div className="p-4">
                      <div className="text-center mb-3">
                        <h1 className="text-base font-bold text-white leading-tight">
                          {headline || "Enter a headline..."}
                        </h1>
                        <p className="text-zinc-500 mt-1 text-[11px]">
                          {subheadline || "Enter a sub-headline..."}
                        </p>
                      </div>

                      <div className="bg-zinc-800/50 border border-orange-500/20 rounded-lg p-3 mb-3">
                        {downsellProductData ? (
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {downsellProductData.imageUrl ? (
                                <img src={downsellProductData.imageUrl} alt={downsellProductData.title} className="h-14 w-14 rounded-lg object-cover border border-orange-500/30" />
                              ) : (
                                <div className="h-14 w-14 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-lg flex items-center justify-center border border-orange-500/30">
                                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h2 className="text-sm font-semibold text-white">{downsellProductData.title}</h2>
                              <p className="text-zinc-400 text-[10px] mt-0.5 line-clamp-2">{downsellProductData.headline || downsellProductData.description || "No description"}</p>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="text-lg font-bold text-orange-400">{formatPrice(downsellProductData.price, downsellProductData.currency)}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-zinc-500 text-sm">No downsell product selected</p>
                            <p className="text-zinc-600 text-xs mt-1">Select a downsell product in your dashboard</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 justify-center mb-3">
                        {[bullet1, bullet2, bullet3].map((bullet, index) => (
                          bullet && (
                            <span key={index} className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-full px-2 py-1">
                              <svg className="w-2.5 h-2.5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="text-zinc-300 text-[10px]">{bullet}</span>
                            </span>
                          )
                        ))}
                      </div>

                      {showSocialProof && (
                        <div className="text-center mb-3 py-2 border-t border-b border-zinc-800">
                          <div className="flex items-center justify-center gap-0.5 text-yellow-400 text-xs mb-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className={i < starRating ? "text-yellow-400" : "text-zinc-600"}>★</span>
                            ))}
                          </div>
                          <p className="text-zinc-400 text-[10px] italic">&ldquo;{reviewText || "Enter review..."}&rdquo; - {authorName || "@user"}</p>
                        </div>
                      )}

                      <button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold py-2.5 px-4 rounded-lg transition-all cursor-pointer shadow-lg shadow-orange-500/20">
                        <span className="flex flex-col items-center">
                          <span className="text-sm">{buttonText || "Enter button text..."}</span>
                          <span className="text-[9px] text-orange-100/70 font-normal">One-Click Charge</span>
                        </span>
                      </button>

                      <div className="text-center mt-2">
                        <button className="text-zinc-600 hover:text-zinc-500 text-[9px] cursor-pointer">
                          No thanks, continue without this
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Mobile View - Phone frame (6.1" display proportions ~1:2.16 ratio) */
            <div className="relative w-[220px] bg-zinc-800 rounded-[2.5rem] p-1.5 shadow-2xl border border-zinc-700 mt-16">
              <div className="w-full h-[475px] rounded-[2rem] overflow-hidden bg-gradient-to-br from-purple-900/30 via-zinc-950 to-green-900/20">
                {/* Dynamic Island / Notch area */}
                <div className="h-7 bg-zinc-900/80 flex items-center justify-center pt-1">
                  <div className="w-20 h-5 bg-black rounded-full"></div>
                </div>
                {/* Content */}
                <div className="h-[calc(100%-1.75rem)] flex items-center justify-center p-2 overflow-y-auto">
                  {activeProduct === "upsell" ? (
                    /* UPSELL CARD - Mobile */
                    <div className="w-full max-w-[220px] bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl overflow-hidden scale-[0.85]">
                      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-zinc-800 px-2 py-1">
                        <div className="flex items-center gap-1">
                          <span className="relative flex h-1 w-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1 w-1 bg-green-500"></span>
                          </span>
                          <p className="text-green-400 text-[8px] font-medium">Limited Time Offer</p>
                        </div>
                      </div>

                      <div className="p-2">
                        <div className="text-center mb-1.5">
                          <h1 className="text-[11px] font-bold text-white leading-tight">{headline || "Enter a headline..."}</h1>
                          <p className="text-zinc-400 mt-0.5 text-[8px]">{subheadline || "Enter a sub-headline..."}</p>
                        </div>

                        <div className="bg-zinc-800/50 border border-zinc-700 rounded-md p-1.5 mb-1.5">
                          {upsellProductData ? (
                            <div className="flex gap-1.5">
                              <div className="flex-shrink-0">
                                {upsellProductData.imageUrl ? (
                                  <img src={upsellProductData.imageUrl} alt={upsellProductData.title} className="h-9 w-9 rounded-md object-cover border border-zinc-700" />
                                ) : (
                                  <div className="h-9 w-9 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-md flex items-center justify-center border border-zinc-700">
                                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h2 className="text-[9px] font-semibold text-white">{upsellProductData.title}</h2>
                                <span className="text-[10px] font-bold text-green-500">{formatPrice(upsellProductData.price, upsellProductData.currency)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-1.5">
                              <p className="text-zinc-500 text-[8px]">No upsell product selected</p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-0.5 mb-1.5">
                          {[bullet1, bullet2, bullet3].map((bullet, index) => (
                            bullet && (
                              <div key={index} className="flex items-center gap-1">
                                <div className="h-2.5 w-2.5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-1.5 h-1.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <p className="text-zinc-300 text-[7px]">{bullet}</p>
                              </div>
                            )
                          ))}
                        </div>

                        {showSocialProof && (
                          <div className="bg-zinc-800/30 border border-zinc-800 rounded-md p-1.5 mb-1.5">
                            <div className="flex items-start gap-1">
                              <div className="h-4 w-4 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-semibold text-[6px]">{authorName ? authorName.charAt(0).toUpperCase() : "U"}</span>
                              </div>
                              <div>
                                <div className="flex items-center gap-0.5 text-yellow-400 text-[6px]">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={i} className={i < starRating ? "text-yellow-400" : "text-zinc-600"}>★</span>
                                  ))}
                                </div>
                                <p className="text-zinc-300 text-[6px] mt-0.5 italic leading-tight line-clamp-2">&ldquo;{reviewText || "Enter review..."}&rdquo;</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-0.5">
                          <button className="w-full bg-green-600 text-white font-semibold py-1.5 px-2 rounded-md">
                            <span className="flex flex-col items-center">
                              <span className="text-[8px]">{buttonText || "Enter button text..."}</span>
                              <span className="text-[6px] text-green-200/70 font-normal">One-Click Charge</span>
                            </span>
                          </button>
                          <div className="text-center">
                            <button className="text-zinc-500 text-[6px]">No thanks</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* DOWNSELL CARD - Mobile */
                    <div className="w-full max-w-[220px] bg-zinc-900/90 backdrop-blur-xl border border-orange-500/30 rounded-xl shadow-2xl overflow-hidden scale-[0.85]">
                      <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 px-2 py-1 text-center">
                        <p className="text-orange-400 text-[7px] font-semibold uppercase tracking-wider">Last Chance Offer</p>
                      </div>

                      <div className="p-2">
                        <div className="text-center mb-1.5">
                          <h1 className="text-[11px] font-bold text-white leading-tight">{headline || "Enter a headline..."}</h1>
                          <p className="text-zinc-500 mt-0.5 text-[8px]">{subheadline || "Enter a sub-headline..."}</p>
                        </div>

                        <div className="bg-zinc-800/50 border border-orange-500/20 rounded-md p-1.5 mb-1.5">
                          {downsellProductData ? (
                            <div className="flex items-center gap-1.5">
                              <div className="flex-shrink-0">
                                {downsellProductData.imageUrl ? (
                                  <img src={downsellProductData.imageUrl} alt={downsellProductData.title} className="h-8 w-8 rounded-md object-cover border border-orange-500/30" />
                                ) : (
                                  <div className="h-8 w-8 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-md flex items-center justify-center border border-orange-500/30">
                                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h2 className="text-[9px] font-semibold text-white">{downsellProductData.title}</h2>
                                <span className="text-[11px] font-bold text-orange-400">{formatPrice(downsellProductData.price, downsellProductData.currency)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-1.5">
                              <p className="text-zinc-500 text-[8px]">No downsell product selected</p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-0.5 justify-center mb-1.5">
                          {[bullet1, bullet2, bullet3].map((bullet, index) => (
                            bullet && (
                              <span key={index} className="inline-flex items-center gap-0.5 bg-zinc-800 border border-zinc-700 rounded-full px-1 py-0.5">
                                <svg className="w-1.5 h-1.5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="text-zinc-300 text-[6px]">{bullet}</span>
                              </span>
                            )
                          ))}
                        </div>

                        {showSocialProof && (
                          <div className="text-center mb-1.5 py-1 border-t border-b border-zinc-800">
                            <div className="flex items-center justify-center gap-0.5 text-yellow-400 text-[7px] mb-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className={i < starRating ? "text-yellow-400" : "text-zinc-600"}>★</span>
                              ))}
                            </div>
                            <p className="text-zinc-400 text-[6px] italic line-clamp-1">&ldquo;{reviewText || "Enter review..."}&rdquo;</p>
                          </div>
                        )}

                        <button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-1.5 px-2 rounded-md">
                          <span className="flex flex-col items-center">
                            <span className="text-[9px]">{buttonText || "Enter button text..."}</span>
                            <span className="text-[6px] text-orange-100/70 font-normal">One-Click Charge</span>
                          </span>
                        </button>

                        <div className="text-center mt-1">
                          <button className="text-zinc-600 text-[6px]">No thanks</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Control Panel (30%) */}
      <div className="w-[30%] bg-zinc-900 border-l border-zinc-800 flex flex-col">
        {/* Header with Save Button */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-white">Edit Offer</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                activeProduct === "upsell"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-orange-500/20 text-orange-400"
              }`}>
                {activeProduct === "upsell" ? "Upsell" : "Downsell"}
              </span>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 border border-green-500 rounded-lg text-white text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
          <p className="text-zinc-400 text-sm">
            Customize your {activeProduct} offer. Changes appear instantly in the preview.
          </p>
          {saveMessage && (
            <div className={`mt-3 px-3 py-2 rounded-lg text-sm ${
              saveMessage.type === "success"
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              {saveMessage.text}
            </div>
          )}
        </div>

        {/* Scrollable Form Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Headline */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Enter headline..."
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Sub-headline */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Sub-headline</label>
            <textarea
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              placeholder="Enter sub-headline..."
              rows={3}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Button Text */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Button Text</label>
            <input
              type="text"
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              placeholder="Enter button text..."
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-xs text-zinc-500">
              &quot;One-Click Charge&quot; subtext is always shown below the button.
            </p>
          </div>

          {/* Divider - Bullet Points */}
          <div className="border-t border-zinc-800 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Bullet Points</h3>
          </div>

          {/* Bullet Point 1 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Bullet Point 1</label>
            <input
              type="text"
              value={bullet1}
              onChange={(e) => setBullet1(e.target.value)}
              placeholder="Enter benefit..."
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Bullet Point 2 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Bullet Point 2</label>
            <input
              type="text"
              value={bullet2}
              onChange={(e) => setBullet2(e.target.value)}
              placeholder="Enter benefit..."
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Bullet Point 3 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Bullet Point 3</label>
            <input
              type="text"
              value={bullet3}
              onChange={(e) => setBullet3(e.target.value)}
              placeholder="Enter benefit..."
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-xs text-zinc-500">
              Leave empty to hide a bullet point.
            </p>
          </div>

          {/* Divider - Social Proof */}
          <div className="border-t border-zinc-800 pt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Social Proof</h3>
          </div>

          {/* Social Proof Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-zinc-300">Show Review</label>
              <p className="text-xs text-zinc-500 mt-0.5">Display a customer testimonial</p>
            </div>
            <button
              onClick={() => setShowSocialProof(!showSocialProof)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                showSocialProof ? "bg-green-500" : "bg-zinc-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showSocialProof ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Social Proof Fields (Conditional) */}
          {showSocialProof && (
            <div className="space-y-4 pl-0 border-l-2 border-green-500/30 ml-0 animate-in fade-in duration-200">
              <div className="pl-4 space-y-4">
                {/* Star Rating */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Star Rating</label>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setStarRating(i + 1)}
                        className="text-2xl cursor-pointer transition-colors"
                      >
                        <span className={i < starRating ? "text-yellow-400" : "text-zinc-600 hover:text-zinc-500"}>
                          ★
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Review Text */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Review Text</label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Enter customer review..."
                    rows={4}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Author Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Author Name</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="@username"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 text-center">
            Changes are saved when you click &quot;Save Changes&quot;
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
