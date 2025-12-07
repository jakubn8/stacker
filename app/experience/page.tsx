"use client";

import { Button } from "@whop/frosted-ui";

// Mock products data
const products = [
  {
    id: "1",
    title: "Trading Course Masterclass",
    description: "Complete trading education from beginner to advanced",
    price: "$199.00",
    image: null,
    owned: false,
    popular: true,
  },
  {
    id: "2",
    title: "VIP Signals Access",
    description: "Daily premium trading signals with entry & exit points",
    price: "$49.00",
    image: null,
    owned: true,
    popular: false,
  },
  {
    id: "3",
    title: "Risk Management Protocol",
    description: "Protect your capital with proven risk strategies",
    price: "$19.00",
    image: null,
    owned: false,
    popular: false,
  },
  {
    id: "4",
    title: "Private Community Access",
    description: "Join our exclusive Discord with 5000+ traders",
    price: "$29.00",
    image: null,
    owned: true,
    popular: false,
  },
  {
    id: "5",
    title: "Options Trading Guide",
    description: "Master options trading with our comprehensive guide",
    price: "$79.00",
    image: null,
    owned: false,
    popular: true,
  },
  {
    id: "6",
    title: "Technical Analysis Toolkit",
    description: "Custom indicators and chart templates for MT4/5",
    price: "$39.00",
    image: null,
    owned: false,
    popular: false,
  },
];

function ProductCard({
  product,
}: {
  product: (typeof products)[0];
}) {
  const gradients = [
    "from-purple-500/20 to-blue-500/20",
    "from-orange-500/20 to-pink-500/20",
    "from-green-500/20 to-teal-500/20",
    "from-blue-500/20 to-indigo-500/20",
    "from-pink-500/20 to-rose-500/20",
    "from-teal-500/20 to-cyan-500/20",
  ];

  const icons = [
    <svg key="1" className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>,
    <svg key="2" className="w-12 h-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>,
    <svg key="3" className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>,
    <svg key="4" className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>,
    <svg key="5" className="w-12 h-12 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>,
    <svg key="6" className="w-12 h-12 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>,
  ];

  const index = parseInt(product.id) - 1;
  const gradient = gradients[index % gradients.length];
  const icon = icons[index % icons.length];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all hover:shadow-lg hover:shadow-zinc-900/50 group">
      {/* Product Image / Placeholder */}
      <div className={`relative aspect-square bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        {icon}
      </div>

      {/* Product Info - More emphasis */}
      <div className="p-5">
        <h3 className="text-white font-semibold text-base group-hover:text-green-400 transition-colors">
          {product.title}
        </h3>
        <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
          {product.description}
        </p>

        {/* Price & Button */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
          {!product.owned && (
            <span className="text-green-500 font-bold text-lg">{product.price}</span>
          )}
          {product.owned && <span className="text-zinc-500 text-sm">Purchased</span>}

          {product.owned ? (
            <Button variant="secondary" size="sm" isDisabled className="opacity-50">
              Purchased
            </Button>
          ) : (
            <Button variant="primary" colorScheme="success-green" size="sm" className="cursor-pointer">
              Buy
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExperiencePage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Store</h1>
          <p className="text-zinc-400 mt-2">
            Browse our premium products
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Empty State (Hidden by default, shown when no products) */}
        {products.length === 0 && (
          <div className="text-center py-16">
            <div className="h-16 w-16 bg-zinc-800 rounded-full mx-auto flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-zinc-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h3 className="text-white font-semibold text-lg">No products yet</h3>
            <p className="text-zinc-400 mt-1">
              Products will appear here once they&apos;re added
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
