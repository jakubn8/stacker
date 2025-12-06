"use client";

import { useState } from "react";
import {
  Button,
  Select,
  Switch,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Badge,
} from "@whop/frosted-ui";

// Mock data
const mockProducts = [
  {
    id: "1",
    image: "/placeholder-product.png",
    title: "Trading Course Masterclass",
    storefrontName: "Master Trading Course",
    price: "$199.00",
  },
  {
    id: "2",
    image: "/placeholder-product.png",
    title: "VIP Signals Access",
    storefrontName: "Premium VIP Signals",
    price: "$49.00",
  },
  {
    id: "3",
    image: "/placeholder-product.png",
    title: "Risk Management Protocol",
    storefrontName: "Risk Management Guide",
    price: "$19.00",
  },
  {
    id: "4",
    image: "/placeholder-product.png",
    title: "Private Community Access",
    storefrontName: "Exclusive Community",
    price: "$29.00",
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
  { value: "none", textValue: "No downsell (optional)" },
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
  const [downsellProduct, setDownsellProduct] = useState("none");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<typeof mockProducts[0] | null>(null);
  const [editedName, setEditedName] = useState("");

  const handleEdit = (product: typeof mockProducts[0]) => {
    setSelectedProduct(product);
    setEditedName(product.storefrontName);
    setEditModalOpen(true);
  };

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        {/* Upsell Configuration Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Upsell Flow</h2>
              <p className="text-zinc-400 text-sm mt-1">
                Configure your post-purchase upsell sequence
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                text={isActive ? "Active" : "Inactive"}
                colorScheme={isActive ? "success-green" : "dark-gray"}
              />
              <Switch
                checked={isActive}
                setChecked={setIsActive}
                label=""
                colorScheme="success-green"
              />
            </div>
          </div>

          {/* Visual Flow */}
          <div className="relative">
            {/* Vertical Connection Line */}
            <div className="absolute left-6 top-12 bottom-12 w-0.5 bg-zinc-700" />

            {/* Step 1: Trigger Product */}
            <div className="relative flex gap-4 mb-2">
              <div className="relative z-10 flex-shrink-0 h-12 w-12 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center">
                <span className="text-purple-400 font-bold text-sm">1</span>
              </div>
              <div className="flex-1 pt-1">
                <label className="text-sm font-medium text-white">Trigger Product</label>
                <p className="text-xs text-zinc-500 mb-2">When this product is purchased, the flow starts</p>
                <Select
                  placeholder="Select trigger product..."
                  value={triggerProduct}
                  onValueChange={setTriggerProduct}
                  size="md"
                  items={triggerProducts}
                />
              </div>
            </div>

            {/* Arrow Down */}
            <div className="relative flex gap-4 py-3">
              <div className="flex-shrink-0 w-12 flex justify-center">
                <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <div className="flex-1" />
            </div>

            {/* Step 2: Primary Upsell */}
            <div className="relative flex gap-4 mb-2">
              <div className="relative z-10 flex-shrink-0 h-12 w-12 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                <span className="text-green-400 font-bold text-sm">2</span>
              </div>
              <div className="flex-1 pt-1">
                <label className="text-sm font-medium text-white">Primary Upsell</label>
                <p className="text-xs text-zinc-500 mb-2">Show this offer first</p>
                <Select
                  placeholder="Select upsell product..."
                  value={upsellProduct}
                  onValueChange={setUpsellProduct}
                  size="md"
                  items={upsellProducts}
                />
              </div>
            </div>

            {/* Split Arrow (Accepted/Declined) */}
            <div className="relative flex gap-4 py-3">
              <div className="flex-shrink-0 w-12 flex justify-center">
                <svg className="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <div className="flex-1 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-xs text-green-400">Accepted = Done</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-xs text-orange-400">Declined = Show Downsell</span>
                </div>
              </div>
            </div>

            {/* Step 3: Downsell (Optional) */}
            <div className="relative flex gap-4">
              <div className={`relative z-10 flex-shrink-0 h-12 w-12 rounded-full border-2 flex items-center justify-center ${downsellProduct !== "none" ? "bg-orange-500/20 border-orange-500" : "bg-zinc-800 border-zinc-600 border-dashed"}`}>
                <span className={`font-bold text-sm ${downsellProduct !== "none" ? "text-orange-400" : "text-zinc-500"}`}>3</span>
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-white">Downsell Product</label>
                  <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">Optional</span>
                </div>
                <p className="text-xs text-zinc-500 mb-2">If upsell is declined, show this offer instead</p>
                <Select
                  placeholder="No downsell"
                  value={downsellProduct}
                  onValueChange={setDownsellProduct}
                  size="md"
                  items={downsellProducts}
                />
                <p className="text-xs text-zinc-400 mt-2 italic">
                  This is your second chance to monetize — usually a lower-priced item.
                </p>
              </div>
            </div>
          </div>
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
                  <th className="text-right text-sm font-medium text-zinc-400 px-6 py-4">
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
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEdit(product)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)}>
          <ModalHeader
            title="Edit Product Display"
            description="Customize how this product appears in your storefront"
          />
          <ModalBody>
            <div className="space-y-6">
              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Product Image</label>
                <div className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center hover:border-zinc-500 transition-colors cursor-pointer">
                  <div className="h-16 w-16 bg-zinc-800 rounded-lg mx-auto flex items-center justify-center mb-4">
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
                <Input
                  label="Storefront Display Name"
                  placeholder="Enter display name..."
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" colorScheme="success-green" onClick={() => setEditModalOpen(false)}>
              Save Changes
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </div>
  );
}
