"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

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
  checkoutUrl: string | null;
  planId: string | null;
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

export default function ExperiencePage() {
  const params = useParams();
  const experienceId = params.experienceId as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [purchasingProductId, setPurchasingProductId] = useState<string | null>(null);
  const [settings, setSettings] = useState<StorefrontSettings>(DEFAULT_SETTINGS);

  // Fetch experience data and products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch experience info to get the company ID and storefront settings
        const expResponse = await fetch(`/api/experiences/${experienceId}`);

        if (!expResponse.ok) {
          if (expResponse.status === 403) {
            setError("You don't have access to this storefront");
            return;
          }
          throw new Error("Failed to load storefront");
        }

        const expData = await expResponse.json();
        setCompanyId(expData.companyId);

        // Set storefront settings from the response
        if (expData.storefrontSettings) {
          setSettings(expData.storefrontSettings);
        }

        // Fetch products for this company, filtered by "App access" settings
        // Use allowedProductIds from experience response if available
        let productsUrl = `/api/products?companyId=${expData.companyId}&filterHidden=true`;
        if (expData.allowedProductIds && expData.allowedProductIds.length > 0) {
          productsUrl += `&allowedProductIds=${expData.allowedProductIds.join(",")}`;
        } else {
          // Fallback: pass experienceId to let products API fetch allowed products
          productsUrl += `&experienceId=${experienceId}`;
        }
        const productsResponse = await fetch(productsUrl);
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData.products || []);
        }
      } catch (err) {
        console.error("Error loading experience:", err);
        setError("Failed to load storefront");
      } finally {
        setLoading(false);
      }
    };

    if (experienceId) {
      fetchData();
    }
  }, [experienceId]);

  const formatPrice = (price: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(price);
  };

  const handlePurchase = async (product: Product) => {
    // Must have planId to create checkout
    if (!product.planId || !companyId) {
      console.error("Missing planId or companyId for checkout");
      return;
    }

    setPurchasingProductId(product.id);

    try {
      // Call our checkout API to create a session with Stacker metadata
      // This ensures storefront purchases are tracked for 5% fee
      const response = await fetch("/api/storefront/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: product.planId,
          companyId,
          productId: product.id,
          experienceId,
        }),
      });

      const data = await response.json();

      if (data.success && data.checkoutUrl) {
        // Redirect to Whop checkout with Stacker metadata attached
        window.location.href = data.checkoutUrl;
      } else {
        console.error("Failed to create checkout:", data.error);
        // Fall back to direct checkout URL if API fails
        if (product.checkoutUrl) {
          window.location.href = product.checkoutUrl;
        }
      }
    } catch (err) {
      console.error("Checkout error:", err);
      // Fall back to direct checkout URL on error
      if (product.checkoutUrl) {
        window.location.href = product.checkoutUrl;
      }
    } finally {
      setPurchasingProductId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-gray-300 dark:border-zinc-700 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="h-16 w-16 bg-red-500/10 rounded-full mx-auto flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-500 dark:text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  // Generate responsive grid styles based on settings
  const getGridStyle = () => {
    return {
      gridTemplateColumns: `repeat(${settings.columns}, minmax(0, 1fr))`
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6">
      <style jsx>{`
        @media (max-width: 640px) {
          .products-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <div className="max-w-4xl mx-auto">
        {/* Header - Using customizable settings */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {settings.title}
          </h1>
          <p className="text-gray-500 dark:text-zinc-400">{settings.subtitle}</p>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-16 w-16 bg-gray-100 dark:bg-zinc-800 rounded-full mx-auto flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-zinc-400">{settings.emptyMessage}</p>
          </div>
        ) : (
          <div className="products-grid grid gap-4" style={getGridStyle()}>
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-gray-300 dark:hover:border-zinc-700 transition-colors flex flex-col"
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
                      <svg className="w-12 h-12 text-gray-500 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4 flex flex-col h-full">
                  {/* Title and Price Row */}
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

                  {/* Description */}
                  <p className="text-gray-400 dark:text-zinc-500 text-sm line-clamp-3 mb-4 flex-1 min-h-[3rem]">
                    {product.description || "\u00A0"}
                  </p>

                  {/* Buy Button or Owned - Using customizable accent color and button text */}
                  {product.owned ? (
                    <span className="text-gray-400 dark:text-zinc-500 text-sm font-medium">Owned</span>
                  ) : (
                    <button
                      onClick={() => handlePurchase(product)}
                      disabled={purchasingProductId === product.id}
                      className="w-full py-2.5 rounded-lg font-medium text-white cursor-pointer transition-colors hover:opacity-90 disabled:opacity-60 disabled:cursor-wait"
                      style={{ backgroundColor: settings.accentColor }}
                    >
                      {purchasingProductId === product.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          Processing...
                        </span>
                      ) : (
                        settings.buttonText
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
