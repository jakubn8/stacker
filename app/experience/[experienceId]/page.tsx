"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@whop/frosted-ui";

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

export default function ExperiencePage() {
  const params = useParams();
  const experienceId = params.experienceId as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Fetch experience data and products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch experience info to get the company ID
        const expResponse = await fetch(`/api/experience/${experienceId}`);

        if (!expResponse.ok) {
          if (expResponse.status === 403) {
            setError("You don't have access to this storefront");
            return;
          }
          throw new Error("Failed to load storefront");
        }

        const expData = await expResponse.json();
        setCompanyId(expData.companyId);

        // Fetch products for this company
        const productsResponse = await fetch(`/api/products?companyId=${expData.companyId}`);
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

  const handlePurchase = (product: Product) => {
    // Redirect to Whop checkout for this product
    if (product.checkoutUrl) {
      window.location.href = product.checkoutUrl;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-zinc-700 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="h-16 w-16 bg-red-500/10 rounded-full mx-auto flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-4xl mx-auto">
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
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors"
              >
                {/* Product Image */}
                <div className="aspect-video bg-zinc-800 flex items-center justify-center">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="w-12 h-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="text-white font-semibold mb-1">{product.title}</h3>
                  {product.description && (
                    <p className="text-zinc-500 text-sm mb-3 line-clamp-2">{product.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      {product.owned ? (
                        <span className="text-zinc-400 font-medium">Purchased</span>
                      ) : (
                        <>
                          <span className="text-green-500 font-bold">
                            {formatPrice(product.price, product.currency)}
                          </span>
                          {product.planType === "renewal" && product.billingPeriod && (
                            <span className="text-zinc-500 text-sm">
                              /{product.billingPeriod === 30 ? "mo" : product.billingPeriod === 365 ? "yr" : `${product.billingPeriod}d`}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {product.owned ? (
                      <span className="px-3 py-1.5 bg-zinc-800 text-zinc-400 text-sm font-medium rounded-lg">
                        Owned
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="elevated"
                        onClick={() => handlePurchase(product)}
                      >
                        Buy
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
