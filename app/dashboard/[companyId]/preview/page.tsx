"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import DashboardNav from "@/components/DashboardNav";

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  imageUrl: string | null;
  planType: "one_time" | "renewal" | "free";
  billingPeriod: number | null;
  owned: boolean;
}

interface StorefrontSettings {
  title: string;
  subtitle: string;
  accentColor: string;
  buttonText: string;
  columns: 1 | 2 | 3;
  emptyMessage: string;
}

const DEFAULT_SETTINGS: StorefrontSettings = {
  title: "Available Products",
  subtitle: "Browse and purchase additional products",
  accentColor: "#FA4616",
  buttonText: "Buy",
  columns: 2,
  emptyMessage: "No products available",
};

// Preset colors for the color picker
const PRESET_COLORS = [
  "#FA4616", // Orange (default)
  "#10B981", // Green
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#06B6D4", // Cyan
];

export default function StorefrontEditorPage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const { user: authUser } = useAuth();
  const whopUserId = authUser?.whopUserId || "";

  // Products for preview
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings state
  const [settings, setSettings] = useState<StorefrontSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<StorefrontSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Check for unsaved changes
  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  // Fetch products and settings
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // First, fetch flow settings to get experienceId (needed for product filtering)
      const flowRes = await fetch(`/api/flow/settings?whopUserId=${whopUserId}&companyId=${companyId}`);
      let experienceId = "";
      if (flowRes.ok) {
        const flowData = await flowRes.json();
        experienceId = flowData.experienceId || "";
      }

      // Fetch products and storefront settings in parallel
      const productsUrl = `/api/products?companyId=${companyId}&filterHidden=true${experienceId ? `&experienceId=${experienceId}` : ""}`;
      const [productsRes, settingsRes] = await Promise.all([
        fetch(productsUrl),
        fetch(`/api/storefront/settings?whopUserId=${whopUserId}&companyId=${companyId}`),
      ]);

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        if (data.settings) {
          setSettings(data.settings);
          setSavedSettings(data.settings);
        }
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId, whopUserId]);

  useEffect(() => {
    if (companyId && whopUserId) {
      fetchData();
    }
  }, [companyId, whopUserId, fetchData]);

  // Save settings
  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);

      const response = await fetch("/api/storefront/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whopUserId,
          companyId,
          settings,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSavedSettings(data.settings);
        setSaveMessage({ type: "success", text: "Settings saved!" });
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        const data = await response.json();
        setSaveMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch (error) {
      console.error("Save error:", error);
      setSaveMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  // Format price helper
  const formatPrice = (price: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
        <DashboardNav companyId={companyId} />
        <div className="flex items-center justify-center h-[calc(100vh-56px)]">
          <div className="h-8 w-8 border-2 border-gray-300 dark:border-zinc-700 border-t-green-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <DashboardNav companyId={companyId} />

      <div className="flex h-[calc(100vh-56px)]">
        {/* Left Panel - Editor Controls */}
        <div className="w-80 flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Storefront Editor</h1>
              <p className="text-gray-500 dark:text-zinc-400 text-sm">Customize how your store looks</p>
            </div>

            {/* Save Button */}
            <div className="mb-6">
              <button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
                  hasUnsavedChanges
                    ? "bg-green-600 hover:bg-green-500 text-white cursor-pointer"
                    : "bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed"
                } disabled:opacity-50`}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Saving...
                  </span>
                ) : hasUnsavedChanges ? (
                  "Save Changes"
                ) : (
                  "No Changes"
                )}
              </button>
              {saveMessage && (
                <p className={`text-sm mt-2 text-center ${saveMessage.type === "success" ? "text-green-500" : "text-red-500"}`}>
                  {saveMessage.text}
                </p>
              )}
            </div>

            {/* Settings Sections */}
            <div className="space-y-6">
              {/* Header Section */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Header</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    Store Title
                  </label>
                  <input
                    type="text"
                    value={settings.title}
                    onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Available Products"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    Subtitle
                  </label>
                  <input
                    type="text"
                    value={settings.subtitle}
                    onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Browse and purchase additional products"
                  />
                </div>
              </div>

              {/* Styling Section */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Styling</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                    Accent Color
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSettings({ ...settings, accentColor: color })}
                        className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${
                          settings.accentColor === color ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 ring-gray-900 dark:ring-white" : ""
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.accentColor}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.match(/^#([A-Fa-f0-9]{0,6})$/)) {
                          setSettings({ ...settings, accentColor: val });
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-sm font-mono"
                      placeholder="#FA4616"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={settings.buttonText}
                    onChange={(e) => setSettings({ ...settings, buttonText: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Buy"
                  />
                  <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">e.g. "Buy", "Get Access", "Purchase"</p>
                </div>
              </div>

              {/* Layout Section */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Layout</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                    Grid Columns (Desktop)
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((cols) => (
                      <button
                        key={cols}
                        onClick={() => setSettings({ ...settings, columns: cols as 1 | 2 | 3 })}
                        className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                          settings.columns === cols
                            ? "bg-green-600 text-white"
                            : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {cols} Col{cols > 1 ? "s" : ""}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Empty State Section */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Empty State</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    Empty Message
                  </label>
                  <input
                    type="text"
                    value={settings.emptyMessage}
                    onChange={(e) => setSettings({ ...settings, emptyMessage: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="No products available"
                  />
                  <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">Shown when no products are visible</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Live Preview */}
        <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-zinc-950">
          {/* Preview Banner */}
          <div className="sticky top-0 z-10 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-yellow-600 dark:text-yellow-500 text-sm font-medium">Live Preview</span>
            </div>
          </div>

          {/* Preview Content */}
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              {/* Header Preview */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {settings.title || "Available Products"}
                </h1>
                <p className="text-gray-500 dark:text-zinc-400">
                  {settings.subtitle || "Browse and purchase additional products"}
                </p>
              </div>

              {/* Products Grid Preview */}
              {products.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-16 w-16 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-zinc-400">{settings.emptyMessage || "No products available"}</p>
                </div>
              ) : (
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${settings.columns}, minmax(0, 1fr))`
                  }}
                >
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden flex flex-col"
                    >
                      {/* Product Image */}
                      <div className="aspect-[16/9] bg-gray-100 dark:bg-zinc-800 relative">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-400 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                          <h3 className="text-gray-900 dark:text-white font-semibold text-base">{product.title}</h3>
                          <span className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm font-semibold rounded-lg w-fit">
                            {product.price === 0 ? "Free" : formatPrice(product.price, product.currency)}
                            {product.planType === "renewal" && product.billingPeriod && product.price > 0 && (
                              <span className="text-gray-500 dark:text-zinc-400 ml-1">
                                /{product.billingPeriod === 30 ? "mo" : product.billingPeriod === 365 ? "yr" : `${product.billingPeriod}d`}
                              </span>
                            )}
                          </span>
                        </div>

                        <p className="text-gray-500 dark:text-zinc-500 text-sm line-clamp-3 mb-4 flex-1 min-h-[3rem]">
                          {product.description || "\u00A0"}
                        </p>

                        {/* Preview Button */}
                        <button
                          disabled
                          className="w-full py-2.5 rounded-lg font-medium text-white cursor-not-allowed transition-colors"
                          style={{ backgroundColor: settings.accentColor }}
                        >
                          {settings.buttonText || "Buy"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
