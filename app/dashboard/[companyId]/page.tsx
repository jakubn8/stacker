"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Button,
  Select,
} from "@whop/frosted-ui";

// Mock data
const mockProducts = [
  {
    id: "1",
    image: "/placeholder-product.png",
    title: "Trading Course Masterclass",
    description: "Complete trading education from beginner to advanced levels with live sessions.",
    storefrontName: "Master Trading Course",
    storefrontDescription: "Complete trading education from beginner to advanced levels with live sessions.",
    price: "$199.00",
    paymentType: "one_time" as const,
  },
  {
    id: "2",
    image: "/placeholder-product.png",
    title: "VIP Signals Access",
    description: "Daily premium trading signals with entry & exit points from our expert analysts.",
    storefrontName: "Premium VIP Signals",
    storefrontDescription: "Daily premium trading signals with entry & exit points from our expert analysts.",
    price: "$49.00",
    paymentType: "recurring" as const,
  },
  {
    id: "3",
    image: "/placeholder-product.png",
    title: "Risk Management Protocol",
    description: "Protect your capital with our battle-tested risk management strategies.",
    storefrontName: "Risk Management Guide",
    storefrontDescription: "Protect your capital with our battle-tested risk management strategies.",
    price: "$19.00",
    paymentType: "one_time" as const,
  },
  {
    id: "4",
    image: "/placeholder-product.png",
    title: "Private Community Access",
    description: "Join our exclusive Discord community with 5000+ active traders.",
    storefrontName: "Exclusive Community",
    storefrontDescription: "Join our exclusive Discord community with 5000+ active traders.",
    price: "$29.00",
    paymentType: "recurring" as const,
  },
];

const triggerProducts = [
  { value: "trading-course", textValue: "Trading Course Masterclass" },
  { value: "vip-signals", textValue: "VIP Signals Access" },
  { value: "risk-management", textValue: "Risk Management Protocol" },
];

const upsellProducts = [
  { value: "vip-signals", textValue: "VIP Signals Access - $49.00" },
  { value: "risk-management", textValue: "Risk Management Protocol - $19.00" },
  { value: "private-community", textValue: "Private Community Access - $29.00" },
];

const downsellProducts = [
  { value: "risk-management", textValue: "Risk Management Protocol - $19.00" },
  { value: "private-community", textValue: "Private Community Access - $29.00" },
];

// Mock upsell flow configuration
const mockFlowConfig = {
  triggerProductId: "trading-course",
  upsellProductId: "vip-signals",
  downsellProductId: "risk-management", // Optional - can be null
  isActive: true,
};

export default function DashboardPage() {
  const [isActive, setIsActive] = useState(true);
  const [triggerProduct, setTriggerProduct] = useState("");
  const [upsellProduct, setUpsellProduct] = useState("");
  const [hasDownsell, setHasDownsell] = useState(false);
  const [downsellProduct, setDownsellProduct] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<typeof mockProducts[0] | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [showDiscount, setShowDiscount] = useState(false);
  const [originalPrice, setOriginalPrice] = useState("");

  const handleEdit = (product: typeof mockProducts[0]) => {
    setSelectedProduct(product);
    setEditedName(product.storefrontName);
    setEditedDescription(product.storefrontDescription);
    setShowDiscount(false);
    setOriginalPrice("");
    setEditModalOpen(true);
  };

  const handleRemoveDownsell = () => {
    setHasDownsell(false);
    setDownsellProduct("");
  };

  // Sync hasDownsell state to localStorage for editor page
  useEffect(() => {
    localStorage.setItem("stacker_hasDownsell", JSON.stringify(hasDownsell));
  }, [hasDownsell]);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-zinc-800 pb-6">
          <h1 className="text-3xl font-bold text-white">Stacker Configuration</h1>
          <p className="text-zinc-400 mt-2">
            Configure your post-purchase upsells and storefront display settings
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total Revenue Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm font-medium">Total Revenue Generated</p>
                <p className="text-4xl font-bold text-green-500 mt-2">$1,250.00</p>
              </div>
              <div className="h-12 w-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-zinc-500 text-sm mt-4">+$350.00 this week</p>
          </div>

          {/* Conversion Rate Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm font-medium">Conversion Rate</p>
                <p className="text-4xl font-bold text-white mt-2">12%</p>
              </div>
              <div className="h-12 w-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
            </div>
            <p className="text-zinc-500 text-sm mt-4">32 conversions from 267 views</p>
          </div>
        </div>

        {/* Upsell Flow Builder */}
        <div className="space-y-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Upsell Flow</h2>
              <p className="text-zinc-400 text-sm mt-1">
                Build your post-purchase upsell sequence
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/demo-company/editor"
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white text-sm font-medium transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Offer Page
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-zinc-400">
                  {isActive ? "Active" : "Inactive"}
                </span>
                <button
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    isActive ? "bg-green-500" : "bg-red-500/80"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Step 1: The Trigger */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-purple-400 uppercase tracking-wide">Step 1</span>
                  <span className="text-xs text-zinc-600">•</span>
                  <span className="text-xs text-zinc-500">The Trigger</span>
                </div>
                <label className="text-sm font-medium text-white block mb-2">When this product is purchased...</label>
                <Select
                  placeholder="Select trigger product..."
                  value={triggerProduct}
                  onValueChange={setTriggerProduct}
                  size="md"
                  items={triggerProducts}
                  className="px-4 cursor-pointer"
                  contentClassName="bg-zinc-900 border border-zinc-700 shadow-2xl rounded-lg overflow-hidden [&_[role=option]]:px-4 [&_[role=option]]:py-3 [&_[role=option]]:border-b [&_[role=option]]:border-zinc-800 [&_[role=option]:last-child]:border-b-0 [&_[role=option]]:cursor-pointer [&_[role=option]:hover]:bg-zinc-800 [&_[role=option][data-state=checked]]:bg-zinc-800 [&_[role=option][data-state=checked]]:border-l-2 [&_[role=option][data-state=checked]]:border-l-purple-500 [&_svg]:hidden"
                />
              </div>
            </div>
          </div>

          {/* Connector Line 1 */}
          <div className="flex justify-start pl-9">
            <div className="h-8 w-0.5 bg-zinc-700" />
          </div>

          {/* Step 2: Primary Upsell */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-green-400 uppercase tracking-wide">Step 2</span>
                  <span className="text-xs text-zinc-600">•</span>
                  <span className="text-xs text-zinc-500">Primary Upsell</span>
                </div>
                <label className="text-sm font-medium text-white block mb-2">Show this product</label>
                <Select
                  placeholder="Select upsell product..."
                  value={upsellProduct}
                  onValueChange={setUpsellProduct}
                  size="md"
                  items={upsellProducts}
                  className="px-4 cursor-pointer"
                  contentClassName="bg-zinc-900 border border-zinc-700 shadow-2xl rounded-lg overflow-hidden [&_[role=option]]:px-4 [&_[role=option]]:py-3 [&_[role=option]]:border-b [&_[role=option]]:border-zinc-800 [&_[role=option]:last-child]:border-b-0 [&_[role=option]]:cursor-pointer [&_[role=option]:hover]:bg-zinc-800 [&_[role=option][data-state=checked]]:bg-zinc-800 [&_[role=option][data-state=checked]]:border-l-2 [&_[role=option][data-state=checked]]:border-l-green-500 [&_svg]:hidden"
                />
              </div>
            </div>
          </div>

          {/* Connector Line 2 with Label */}
          <div className="flex items-center pl-9 gap-3">
            <div className="h-8 w-0.5 bg-zinc-700" />
            <div className="flex items-center gap-2 -ml-1">
              <div className="h-0.5 w-4 bg-zinc-700" />
              <span className="text-xs text-orange-400 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                If user clicks &apos;No&apos;...
              </span>
            </div>
          </div>

          {/* Step 3: Downsell (Conditional) */}
          {hasDownsell ? (
            <div className="bg-zinc-900 border border-orange-500/30 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-orange-400 uppercase tracking-wide">Step 3</span>
                      <span className="text-xs text-zinc-600">•</span>
                      <span className="text-xs text-zinc-500">Downsell Offer</span>
                    </div>
                    <button
                      onClick={handleRemoveDownsell}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <label className="text-sm font-medium text-white block mb-2">Show this if they decline</label>
                  <Select
                    placeholder="Select downsell product..."
                    value={downsellProduct}
                    onValueChange={setDownsellProduct}
                    size="md"
                    items={downsellProducts}
                    className="px-4 cursor-pointer"
                    contentClassName="bg-zinc-900 border border-zinc-700 shadow-2xl rounded-lg overflow-hidden [&_[role=option]]:px-4 [&_[role=option]]:py-3 [&_[role=option]]:border-b [&_[role=option]]:border-zinc-800 [&_[role=option]:last-child]:border-b-0 [&_[role=option]]:cursor-pointer [&_[role=option]:hover]:bg-zinc-800 [&_[role=option][data-state=checked]]:bg-zinc-800 [&_[role=option][data-state=checked]]:border-l-2 [&_[role=option][data-state=checked]]:border-l-orange-500 [&_svg]:hidden"
                  />
                  <p className="text-xs text-zinc-500 mt-2">
                    Your second chance to convert — usually a lower-priced alternative.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setHasDownsell(true)}
              className="w-full border-2 border-dashed border-zinc-700 hover:border-zinc-600 rounded-xl p-5 flex items-center justify-center gap-2 text-zinc-400 hover:text-zinc-300 transition-colors group cursor-pointer"
            >
              <svg className="w-5 h-5 text-zinc-500 group-hover:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-sm font-medium">Add Downsell Offer</span>
            </button>
          )}
        </div>

        {/* Storefront Editor Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-xl font-semibold text-white">Storefront Editor</h2>
            <p className="text-zinc-400 text-sm mt-1">
              Customize how your products appear in the storefront
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-900/50">
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-sm font-medium text-zinc-400 px-6 py-4">
                    Product
                  </th>
                  <th className="text-left text-sm font-medium text-zinc-400 px-6 py-4">
                    Original Title
                  </th>
                  <th className="text-left text-sm font-medium text-zinc-400 px-6 py-4">
                    Storefront Display Name
                  </th>
                  <th className="text-left text-sm font-medium text-zinc-400 px-6 py-4">
                    Price
                  </th>
                  <th className="text-center text-sm font-medium text-zinc-400 px-6 py-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="h-12 w-12 bg-zinc-700 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-zinc-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{product.title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-zinc-300">{product.storefrontName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-green-500 font-medium">{product.price}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          className="p-2 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setEditModalOpen(false)}
            />

            {/* Modal Content */}
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-zinc-800 flex-shrink-0">
                <h2 className="text-xl font-semibold text-white">Edit Product Display</h2>
                <p className="text-zinc-400 text-sm mt-1">
                  Customize how this product appears in your storefront
                </p>
              </div>

              {/* Body - Scrollable */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Whop Product Info (Read-only) */}
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Whop Product Info</p>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="text-xs text-zinc-500">Product Name</label>
                      <p className="text-white font-medium mt-1">{selectedProduct?.title}</p>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500">Product Price</label>
                      <p className="text-green-500 font-medium mt-1">{selectedProduct?.price}</p>
                      <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        selectedProduct?.paymentType === "recurring"
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}>
                        {selectedProduct?.paymentType === "recurring" ? (
                          <>
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Recurring
                          </>
                        ) : (
                          <>
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            One Time Purchase
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Product Description</label>
                    <p className="text-zinc-300 text-sm mt-1">{selectedProduct?.description}</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-zinc-800"></div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Product Image</label>
                  <div className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center hover:border-zinc-500 transition-colors cursor-pointer bg-zinc-800/50">
                    <div className="h-16 w-16 bg-zinc-700 rounded-lg mx-auto flex items-center justify-center mb-4">
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
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-zinc-400 text-sm">Click to upload or drag and drop</p>
                    <p className="text-zinc-500 text-xs mt-1">PNG, JPG up to 5MB</p>
                  </div>
                </div>

                {/* Display Name Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Storefront Display Name</label>
                  <input
                    type="text"
                    placeholder="Enter display name..."
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Description Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Storefront Description</label>
                  <textarea
                    placeholder="Enter description..."
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Divider */}
                <div className="border-t border-zinc-800"></div>

                {/* Show Discount Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-zinc-300">Show Discount</label>
                    <p className="text-xs text-zinc-500 mt-0.5">Display a strikethrough original price</p>
                  </div>
                  <button
                    onClick={() => setShowDiscount(!showDiscount)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      showDiscount ? "bg-green-500" : "bg-zinc-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showDiscount ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Original Price Input (Conditional) */}
                {showDiscount && (
                  <div className="space-y-2 pl-0 border-l-2 border-green-500/30 animate-in fade-in duration-200">
                    <div className="pl-4">
                      <label className="text-sm font-medium text-zinc-300">Original Price</label>
                      <p className="text-xs text-zinc-500 mt-0.5 mb-2">This will show as a strikethrough price</p>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                        <input
                          type="text"
                          placeholder="99.00"
                          value={originalPrice}
                          onChange={(e) => setOriginalPrice(e.target.value)}
                          className="w-full pl-8 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-600 mt-2 italic">
                        This is for display purposes only and won&apos;t affect your actual product price on Whop.
                      </p>
                      {originalPrice && selectedProduct && (
                        <div className="mt-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                          <p className="text-xs text-zinc-500 mb-1">Preview:</p>
                          <div className="flex items-center gap-2">
                            <span className="text-green-500 font-bold">{selectedProduct.price}</span>
                            <span className="text-zinc-500 line-through text-sm">${originalPrice}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-zinc-800 flex justify-end gap-3 flex-shrink-0">
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2.5 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
