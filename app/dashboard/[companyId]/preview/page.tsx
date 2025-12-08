"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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
}

export default function StorePreviewPage() {
  const params = useParams();
  const companyId = params.companyId as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products?companyId=${companyId}`);
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error("Error loading products:", err);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchProducts();
    }
  }, [companyId]);

  const formatPrice = (price: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-zinc-700 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link
          href={`/dashboard/${companyId}`}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Preview Banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3 mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-yellow-500 text-sm font-medium">Preview Mode</span>
            <span className="text-yellow-500/70 text-sm">— This is how your store looks to customers</span>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Available Products</h1>
          <p className="text-zinc-400">Browse and purchase additional products</p>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-16 w-16 bg-zinc-800 rounded-full mx-auto flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-zinc-400">No products available</p>
            <p className="text-zinc-500 text-sm mt-2">Products will appear here once synced from Whop</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors flex flex-col"
              >
                {/* Product Image */}
                <div className="aspect-[16/9] bg-zinc-800 relative">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4 flex flex-col h-full">
                  {/* Title and Price Row */}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-semibold text-base">{product.title}</h3>
                    <span className="px-4 py-2 bg-zinc-800 text-white text-sm font-semibold rounded-lg">
                      {product.price === 0 ? "Free" : formatPrice(product.price, product.currency)}
                      {product.planType === "renewal" && product.billingPeriod && product.price > 0 && (
                        <span className="text-zinc-400 ml-1">
                          /{product.billingPeriod === 30 ? "mo" : product.billingPeriod === 365 ? "yr" : `${product.billingPeriod}d`}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-zinc-500 text-sm line-clamp-3 mb-4 flex-1 min-h-[3rem]">
                    {product.description || "\u00A0"}
                  </p>

                  {/* Preview Buy Button (disabled) */}
                  <button
                    disabled
                    className="w-full py-2.5 rounded-lg font-medium text-white opacity-50 cursor-not-allowed"
                    style={{ backgroundColor: '#FA4616' }}
                  >
                    Buy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
