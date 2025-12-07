"use client";

import { useState, useEffect } from "react";

export default function EditorPage() {
  // Product type toggle (upsell vs downsell)
  const [activeProduct, setActiveProduct] = useState<"upsell" | "downsell">("upsell");

  // Check if downsell is configured in dashboard
  const [hasDownsell, setHasDownsell] = useState(false);

  // Read hasDownsell from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("stacker_hasDownsell");
    if (stored !== null) {
      setHasDownsell(JSON.parse(stored));
    }
  }, []);

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

  const handleSave = () => {
    // TODO: Save to database
    console.log("Saving:", {
      upsell: { upsellHeadline, upsellSubheadline, upsellButtonText, upsellBullet1, upsellBullet2, upsellBullet3, upsellShowSocialProof, upsellReviewText, upsellAuthorName, upsellStarRating },
      downsell: { downsellHeadline, downsellSubheadline, downsellButtonText, downsellBullet1, downsellBullet2, downsellBullet3, downsellShowSocialProof, downsellReviewText, downsellAuthorName, downsellStarRating }
    });
    alert("Changes saved successfully!");
  };

  return (
    <div className="h-screen bg-zinc-950 flex overflow-hidden">
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
        </div>

        {/* Centered Preview Card */}
        <div className="h-full flex items-center justify-center p-6">
          {activeProduct === "upsell" ? (
            /* UPSELL CARD - Full featured, green theme */
            <div className="w-full max-w-[340px] bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
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
                  <div className="flex gap-2.5">
                    <div className="flex-shrink-0">
                      <div className="h-16 w-16 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center border border-zinc-700">
                        <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-semibold text-white">VIP Risk Management Protocol</h2>
                      <p className="text-zinc-400 text-[11px] mt-0.5 line-clamp-2">Protect your capital with our battle-tested risk management system.</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-base font-bold text-green-500">$19.00</span>
                        <span className="text-xs text-zinc-500 line-through">$99.00</span>
                        <span className="bg-green-500/10 text-green-400 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">80% OFF</span>
                      </div>
                      {/* Payment Type Badge */}
                      <div className="mt-1.5">
                        <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-400 text-[8px] font-medium px-1.5 py-0.5 rounded-full">
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
            /* DOWNSELL CARD - Different layout, orange theme, product display included */
            <div className="w-full max-w-[320px] bg-zinc-900/90 backdrop-blur-xl border border-orange-500/30 rounded-2xl shadow-2xl overflow-hidden">
              {/* Urgent Header - Different style */}
              <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 px-4 py-2 text-center">
                <p className="text-orange-400 text-[10px] font-semibold uppercase tracking-wider">Last Chance Offer</p>
              </div>

              <div className="p-4">
                {/* Headline - More direct */}
                <div className="text-center mb-3">
                  <h1 className="text-base font-bold text-white leading-tight">
                    {headline || "Enter a headline..."}
                  </h1>
                  <p className="text-zinc-500 mt-1 text-[11px]">
                    {subheadline || "Enter a sub-headline..."}
                  </p>
                </div>

                {/* Product Display - Centered, different style */}
                <div className="bg-zinc-800/50 border border-orange-500/20 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="h-14 w-14 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-lg flex items-center justify-center border border-orange-500/30">
                        <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-semibold text-white">Quick Start Trading Guide</h2>
                      <p className="text-zinc-400 text-[10px] mt-0.5 line-clamp-2">Essential strategies to get you trading confidently.</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-lg font-bold text-orange-400">$9.00</span>
                        <span className="text-[10px] text-zinc-500 line-through">$49.00</span>
                        <span className="bg-orange-500/20 text-orange-400 text-[8px] font-bold px-1.5 py-0.5 rounded">82% OFF</span>
                      </div>
                      {/* Payment Type Badge */}
                      <div className="mt-1.5">
                        <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-400 text-[8px] font-medium px-1.5 py-0.5 rounded-full">
                          <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          One Time Purchase
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compact Benefits - Horizontal pills */}
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

                {/* Social Proof - Minimal inline style */}
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

                {/* CTA Button - Different style, more urgent */}
                <button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold py-2.5 px-4 rounded-lg transition-all cursor-pointer shadow-lg shadow-orange-500/20">
                  <span className="flex flex-col items-center">
                    <span className="text-sm">{buttonText || "Enter button text..."}</span>
                    <span className="text-[9px] text-orange-100/70 font-normal">One-Click Charge</span>
                  </span>
                </button>

                {/* Skip - Less prominent */}
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
              className="px-4 py-2 bg-green-600 hover:bg-green-500 border border-green-500 rounded-lg text-white text-sm font-medium transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
          <p className="text-zinc-400 text-sm">
            Customize your {activeProduct} offer. Changes appear instantly in the preview.
          </p>
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
  );
}
