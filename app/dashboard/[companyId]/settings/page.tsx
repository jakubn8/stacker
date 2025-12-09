"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Button,
  Select,
} from "@whop/frosted-ui";
import { useAuth } from "@/lib/auth-context";
import DashboardNav from "@/components/DashboardNav";

// Flow types
type FlowId = "flow1" | "flow2" | "flow3";

interface FlowState {
  isActive: boolean;
  triggerProductId: string;
  upsellProductId: string;
  downsellProductId: string;
  hasDownsell: boolean;
  notificationTitle: string;
  notificationContent: string;
  notificationsEnabled: boolean;
}

const DEFAULT_FLOW_STATE: FlowState = {
  isActive: false,
  triggerProductId: "",
  upsellProductId: "",
  downsellProductId: "",
  hasDownsell: false,
  notificationTitle: "🎁 Wait! Your order isn't complete...",
  notificationContent: "You unlocked an exclusive offer! Tap to claim it now.",
  notificationsEnabled: true,
};

interface FlowsState {
  flow1: FlowState;
  flow2: FlowState;
  flow3: FlowState;
}

// Billing types
interface BillingStatus {
  user: {
    id: string;
    paymentMethodConnected: boolean;
    email: string | null;
  } | null;
  billing: {
    status: "active" | "grace_period" | "unpaid_lockout";
    pendingFee: number;
    pendingTransactionCount: number;
    nextBillingDate: string | null;
    daysTillBilling: number;
    totalRevenueGeneratedCents: number;
  };
  gracePeriod: {
    paymentFailedAt: string | null;
    endsAt: string;
    hoursRemaining: number;
    isExpired: boolean;
    lastFailedInvoiceId: string | null;
  } | null;
  recentTransactions: Array<{
    id: string;
    productName: string;
    saleAmount: number;
    feeAmount: number;
    createdAt: string;
  }>;
  recentInvoices: Array<{
    id: string;
    periodStart: string;
    periodEnd: string;
    totalFee: number;
    status: string;
  }>;
}

// Analytics types
interface AnalyticsData {
  totalViews: number;
  totalConversions: number;
  conversionRate: number;
  weeklyViews: number;
  weeklyConversions: number;
  weeklyRevenue: number;
}

// Product types
interface WhopProduct {
  id: string;
  title: string;
  description: string | null;
  headline: string | null;
  route: string;
  imageUrl: string | null;
  price: number;
  currency: string;
  planType: "one_time" | "renewal" | "free";
  billingPeriod: number | null;
  planId: string | null;
}

export default function DashboardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const companyId = params.companyId as string;
  const { user: authUser, isAuthenticated } = useAuth();

  // Get the whopUserId from auth context
  const whopUserId = authUser?.whopUserId || "";

  // Multi-flow configuration state
  const [flows, setFlows] = useState<FlowsState>({
    flow1: { ...DEFAULT_FLOW_STATE },
    flow2: { ...DEFAULT_FLOW_STATE },
    flow3: { ...DEFAULT_FLOW_STATE },
  });
  const [flowConfigLoading, setFlowConfigLoading] = useState(true);
  const [flowSaving, setFlowSaving] = useState<FlowId | null>(null);

  // Expanded flow accordions state
  const [expandedFlows, setExpandedFlows] = useState<Set<FlowId>>(new Set(["flow1"]));

  // Payment method required modal
  const [showPaymentRequiredModal, setShowPaymentRequiredModal] = useState(false);

  // Editor mobile message
  const [showEditorMobileMessage, setShowEditorMobileMessage] = useState(false);

  const handleEditorClick = (e: React.MouseEvent) => {
    if (window.innerWidth < 640) {
      e.preventDefault();
      setShowEditorMobileMessage(true);
      setTimeout(() => setShowEditorMobileMessage(false), 3000);
    }
  };

  // Hidden products (stored locally, will be persisted to DB)
  const [hiddenProductIds, setHiddenProductIds] = useState<Set<string>>(new Set());

  // Product images state
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedProductIdForUpload, setSelectedProductIdForUpload] = useState<string | null>(null);

  // Products state
  const [products, setProducts] = useState<WhopProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Billing state
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [connectingPayment, setConnectingPayment] = useState(false);
  const [billingSuccess, setBillingSuccess] = useState(false);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [payingNow, setPayingNow] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  // Analytics state
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalViews: 0,
    totalConversions: 0,
    conversionRate: 0,
    weeklyViews: 0,
    weeklyConversions: 0,
    weeklyRevenue: 0,
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Check for billing success from redirect
  useEffect(() => {
    if (searchParams.get("billing") === "success") {
      setBillingSuccess(true);
      // Clear the URL param
      window.history.replaceState({}, "", `/dashboard/${companyId}`);
      // Refresh billing status
      fetchBillingStatus();
    }
  }, [searchParams, companyId]);

  // Fetch billing status
  const fetchBillingStatus = useCallback(async () => {
    try {
      setBillingLoading(true);
      const response = await fetch(`/api/billing/status?whopUserId=${whopUserId}`);

      if (response.ok) {
        const data = await response.json();
        setBillingStatus(data);
      } else if (response.status === 404) {
        // User doesn't exist yet - that's okay
        setBillingStatus(null);
      }
    } catch (error) {
      console.error("Failed to fetch billing status:", error);
    } finally {
      setBillingLoading(false);
    }
  }, [whopUserId]);

  useEffect(() => {
    fetchBillingStatus();
  }, [fetchBillingStatus]);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const response = await fetch(`/api/analytics?whopUserId=${whopUserId}`);

      if (response.ok) {
        const data = await response.json();
        if (data.analytics) {
          setAnalytics({
            totalViews: data.analytics.totalViews,
            totalConversions: data.analytics.totalConversions,
            conversionRate: data.analytics.conversionRate,
            weeklyViews: data.analytics.weeklyViews,
            weeklyConversions: data.analytics.weeklyConversions,
            weeklyRevenue: data.analytics.weeklyRevenue,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [whopUserId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Fetch products from Whop - prioritize URL param if it's a valid biz_xxx ID
  const realCompanyId = companyId.startsWith("biz_") ? companyId : (authUser?.whopCompanyId?.startsWith("biz_") ? authUser.whopCompanyId : null);

  const fetchProducts = useCallback(async () => {
    if (!realCompanyId) {
      setProductsError("Unable to determine company ID. Please try refreshing.");
      setProductsLoading(false);
      return;
    }

    try {
      setProductsLoading(true);
      setProductsError(null);
      const response = await fetch(`/api/products?companyId=${realCompanyId}`);

      if (response.ok) {
        const data = await response.json();
        if (data.products) {
          setProducts(data.products);
        }
      } else {
        const errorData = await response.json();
        setProductsError(errorData.error || "Failed to fetch products from Whop");
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setProductsError("Failed to fetch products. Please try again.");
    } finally {
      setProductsLoading(false);
    }
  }, [realCompanyId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fetch flow config
  // Helper to convert API flow to local FlowState
  const apiFlowToState = (apiFlow: {
    isActive: boolean;
    triggerProductId: string | null;
    upsellProductId: string | null;
    downsellProductId: string | null;
    notificationSettings?: { title?: string; content?: string; enabled?: boolean };
  }): FlowState => ({
    isActive: apiFlow.isActive || false,
    triggerProductId: apiFlow.triggerProductId || "",
    upsellProductId: apiFlow.upsellProductId || "",
    downsellProductId: apiFlow.downsellProductId || "",
    hasDownsell: !!apiFlow.downsellProductId,
    notificationTitle: apiFlow.notificationSettings?.title || DEFAULT_FLOW_STATE.notificationTitle,
    notificationContent: apiFlow.notificationSettings?.content || DEFAULT_FLOW_STATE.notificationContent,
    notificationsEnabled: apiFlow.notificationSettings?.enabled !== false,
  });

  const fetchFlowConfig = useCallback(async () => {
    try {
      setFlowConfigLoading(true);
      const response = await fetch(`/api/flow/settings?whopUserId=${whopUserId}&companyId=${realCompanyId || companyId}`);

      if (response.ok) {
        const data = await response.json();

        // Load all flows from API
        if (data.flows) {
          setFlows({
            flow1: apiFlowToState(data.flows.flow1),
            flow2: apiFlowToState(data.flows.flow2),
            flow3: apiFlowToState(data.flows.flow3),
          });

          // Auto-expand flows that are active
          const activeFlows: FlowId[] = [];
          if (data.flows.flow1?.isActive) activeFlows.push("flow1");
          if (data.flows.flow2?.isActive) activeFlows.push("flow2");
          if (data.flows.flow3?.isActive) activeFlows.push("flow3");
          if (activeFlows.length > 0) {
            setExpandedFlows(new Set(activeFlows));
          }
        }

        if (data.hiddenProductIds) {
          setHiddenProductIds(new Set(data.hiddenProductIds));
        }
        // Load product images
        if (data.productImages) {
          setProductImages(data.productImages);
        }
      }
    } catch (error) {
      console.error("Failed to fetch flow config:", error);
    } finally {
      setFlowConfigLoading(false);
    }
  }, [whopUserId, companyId, realCompanyId]);

  useEffect(() => {
    fetchFlowConfig();
  }, [fetchFlowConfig]);

  // Save flow config to database (with flowId)
  const saveFlowConfig = useCallback(async (flowId: FlowId, updates: {
    flowConfig?: {
      isActive?: boolean;
      triggerProductId?: string | null;
      upsellProductId?: string | null;
      downsellProductId?: string | null;
    };
    notificationSettings?: {
      title?: string;
      content?: string;
      enabled?: boolean;
    };
  }) => {
    try {
      setFlowSaving(flowId);
      const response = await fetch("/api/flow/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whopUserId,
          companyId: realCompanyId || companyId,
          flowId,
          ...updates,
        }),
      });

      if (!response.ok) {
        console.error("Failed to save flow config");
      }
    } catch (error) {
      console.error("Failed to save flow config:", error);
    } finally {
      setFlowSaving(null);
    }
  }, [whopUserId, companyId, realCompanyId]);

  // Update flow state locally and save to database
  const updateFlow = useCallback((flowId: FlowId, updates: Partial<FlowState>) => {
    setFlows(prev => ({
      ...prev,
      [flowId]: { ...prev[flowId], ...updates }
    }));
  }, []);

  // Toggle flow accordion
  const toggleFlowExpanded = (flowId: FlowId) => {
    setExpandedFlows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(flowId)) {
        newSet.delete(flowId);
      } else {
        newSet.add(flowId);
      }
      return newSet;
    });
  };

  // Flow handlers
  const handleSetFlowActive = (flowId: FlowId, active: boolean) => {
    // Can't activate without a payment method
    if (active && !billingStatus?.user?.paymentMethodConnected) {
      setShowPaymentRequiredModal(true);
      return;
    }
    // Can't activate if in lockout status
    if (active && billingStatus?.billing?.status === "unpaid_lockout") {
      // Don't allow activation - they need to pay first
      return;
    }
    updateFlow(flowId, { isActive: active });
    saveFlowConfig(flowId, { flowConfig: { isActive: active } });
  };

  const handleSetTriggerProduct = (flowId: FlowId, productId: string) => {
    updateFlow(flowId, { triggerProductId: productId });
    saveFlowConfig(flowId, { flowConfig: { triggerProductId: productId || null } });
  };

  const handleSetUpsellProduct = (flowId: FlowId, productId: string) => {
    updateFlow(flowId, { upsellProductId: productId });
    saveFlowConfig(flowId, { flowConfig: { upsellProductId: productId || null } });
  };

  const handleSetDownsellProduct = (flowId: FlowId, productId: string) => {
    updateFlow(flowId, { downsellProductId: productId });
    saveFlowConfig(flowId, { flowConfig: { downsellProductId: productId || null } });
  };

  const handleAddDownsell = (flowId: FlowId) => {
    updateFlow(flowId, { hasDownsell: true });
  };

  const handleRemoveDownsellForFlow = (flowId: FlowId) => {
    updateFlow(flowId, { hasDownsell: false, downsellProductId: "" });
    saveFlowConfig(flowId, { flowConfig: { downsellProductId: null } });
  };

  // Notification handlers for specific flow
  const handleNotificationTitleChange = (flowId: FlowId, value: string) => {
    updateFlow(flowId, { notificationTitle: value });
  };

  const handleNotificationContentChange = (flowId: FlowId, value: string) => {
    updateFlow(flowId, { notificationContent: value });
  };

  const handleNotificationsEnabledChange = (flowId: FlowId, enabled: boolean) => {
    updateFlow(flowId, { notificationsEnabled: enabled });
    saveFlowConfig(flowId, { notificationSettings: { enabled } });
  };

  const handleSaveNotificationText = (flowId: FlowId) => {
    const flow = flows[flowId];
    saveFlowConfig(flowId, {
      notificationSettings: {
        title: flow.notificationTitle,
        content: flow.notificationContent,
      }
    });
  };

  // Helper function to format price
  const formatPrice = (price: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(price);
  };

  // Generate dropdown items from products
  const productDropdownItems = products.map((p) => ({
    value: p.id,
    textValue: `${p.title} - ${formatPrice(p.price, p.currency)}`,
  }));

  // Connect payment method
  const handleConnectPayment = async () => {
    try {
      setConnectingPayment(true);
      setBillingError(null);

      const response = await fetch("/api/billing/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whopUserId: whopUserId,
          whopCompanyId: companyId,
          // Member ID will be resolved server-side from the user
        }),
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.alreadyConnected) {
        fetchBillingStatus();
      }
    } catch (error) {
      console.error("Failed to setup billing:", error);
      setBillingError("Failed to connect payment method. Please try again.");
    } finally {
      setConnectingPayment(false);
    }
  };

  // Retry payment with saved card
  const handleRetryPayment = async () => {
    try {
      setRetryingPayment(true);
      setBillingError(null);
      // Use authenticated user ID

      const response = await fetch("/api/billing/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whopUserId: whopUserId }),
      });

      const data = await response.json();

      if (data.success) {
        setBillingSuccess(true);
        fetchBillingStatus();
      } else {
        setBillingError(data.error || "Payment retry failed. Please try a different card.");
      }
    } catch (error) {
      console.error("Failed to retry payment:", error);
      setBillingError("Failed to retry payment. Please try again.");
    } finally {
      setRetryingPayment(false);
    }
  };

  // Pay now with any card (one-time checkout)
  const handlePayNow = async () => {
    try {
      setPayingNow(true);
      setBillingError(null);
      // Use authenticated user ID

      const response = await fetch("/api/billing/pay-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whopUserId: whopUserId }),
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setBillingError(data.error || "Failed to create checkout. Please try again.");
      }
    } catch (error) {
      console.error("Failed to pay now:", error);
      setBillingError("Failed to create payment. Please try again.");
    } finally {
      setPayingNow(false);
    }
  };

  // Update payment method (redirects to setup checkout)
  const handleUpdatePaymentMethod = async () => {
    try {
      setConnectingPayment(true);
      setBillingError(null);

      const response = await fetch("/api/billing/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whopUserId: whopUserId,
          whopCompanyId: companyId,
          updateExisting: true, // Flag to update rather than create
        }),
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error("Failed to update payment method:", error);
      setBillingError("Failed to update payment method. Please try again.");
    } finally {
      setConnectingPayment(false);
    }
  };

  const handleHideProduct = async (productId: string) => {
    const newHiddenIds = [...hiddenProductIds, productId];
    setHiddenProductIds(new Set(newHiddenIds));

    // Save to database
    try {
      await fetch("/api/flow/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whopUserId,
          companyId: realCompanyId || companyId,
          hiddenProductIds: newHiddenIds,
        }),
      });
    } catch (error) {
      console.error("Failed to save hidden products:", error);
    }
  };

  const handleUnhideProduct = async (productId: string) => {
    const newHiddenIds = [...hiddenProductIds].filter(id => id !== productId);
    setHiddenProductIds(new Set(newHiddenIds));

    // Save to database
    try {
      await fetch("/api/flow/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whopUserId,
          companyId: realCompanyId || companyId,
          hiddenProductIds: newHiddenIds,
        }),
      });
    } catch (error) {
      console.error("Failed to save hidden products:", error);
    }
  };

  // Image upload handlers
  const handleImageUploadClick = (productId: string) => {
    setSelectedProductIdForUpload(productId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProductIdForUpload) return;

    try {
      setUploadingProductId(selectedProductIdForUpload);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("productId", selectedProductIdForUpload);

      const response = await fetch("/api/products/image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.imageUrl) {
        setProductImages((prev) => ({
          ...prev,
          [selectedProductIdForUpload]: data.imageUrl,
        }));
      } else {
        console.error("Failed to upload image:", data.error);
        alert(data.error || "Failed to upload image");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingProductId(null);
      setSelectedProductIdForUpload(null);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Filter products into visible and hidden
  const visibleProducts = products.filter((p) => !hiddenProductIds.has(p.id));
  const hiddenProducts = products.filter((p) => hiddenProductIds.has(p.id));

  // Flow display names
  const flowNames: Record<FlowId, string> = {
    flow1: "Upsell Flow 1",
    flow2: "Upsell Flow 2",
    flow3: "Upsell Flow 3",
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <style jsx>{`
        @media (max-width: 640px) {
          .stats-card {
            position: relative;
            padding: 0.75rem !important;
          }
          .stats-card .flex {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .stats-card-title {
            font-size: 0.75rem !important;
            max-width: 70% !important;
          }
          .stats-card-icon {
            position: absolute !important;
            top: 0.75rem !important;
            right: 0.75rem !important;
            width: 1.75rem !important;
            height: 1.75rem !important;
          }
          .stats-card-icon > svg {
            width: 0.875rem !important;
            height: 0.875rem !important;
            margin: auto !important;
            display: block !important;
          }
          .stats-card-number {
            font-size: 1.5rem !important;
            margin-top: 0.5rem !important;
          }
          .stats-card-footer {
            margin-top: 0.5rem !important;
            font-size: 0.625rem !important;
          }
          /* Billing section mobile styles */
          .billing-header {
            flex-direction: row !important;
            flex-wrap: wrap !important;
            align-items: flex-start !important;
            gap: 0.5rem !important;
          }
          .billing-header-left {
            flex: 1 !important;
          }
          .billing-header-left h2 {
            font-size: 1.125rem !important;
          }
          .billing-header-left p {
            font-size: 0.75rem !important;
            margin-top: 0.25rem !important;
          }
          .billing-actions-btn {
            width: 100% !important;
            justify-content: center !important;
          }
          /* Upsell Flow section mobile styles */
          .upsell-flow-title-section h2 {
            font-size: 1.125rem !important;
          }
          .upsell-flow-subtitle {
            font-size: 0.75rem !important;
          }
          /* Step cards dropdown mobile styles */
          .step-card-layout {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
          }
          .step-card-layout > .step-card-icon {
            margin-bottom: 0.75rem !important;
          }
          .step-card-layout > .step-card-content {
            width: 100% !important;
          }
          .step-card-content .flex {
            justify-content: center !important;
          }
          .step-card-content label {
            text-align: center !important;
          }
          .step-card-select {
            font-size: 0.6875rem !important;
          }
          .step-card-select button {
            font-size: 0.6875rem !important;
          }
          /* Push Notification header mobile styles */
          .notification-header {
            flex-direction: column !important;
            align-items: center !important;
            gap: 1rem !important;
          }
          .notification-header-left {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
          }
          .notification-header-toggle {
            margin-top: 0.5rem !important;
          }
          /* Products section mobile styles */
          .products-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 1rem !important;
          }
          .products-sync-btn {
            width: 100% !important;
            justify-content: center !important;
            white-space: nowrap !important;
          }
          .billing-stats-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 0.5rem !important;
          }
          .billing-stat-card {
            padding: 0.75rem !important;
          }
          .billing-stat-card p:first-child {
            font-size: 0.625rem !important;
          }
          .billing-stat-value {
            font-size: 1rem !important;
          }
        }
      `}</style>
      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Payment Required Modal */}
      {showPaymentRequiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowPaymentRequiredModal(false)}
          />
          {/* Modal */}
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setShowPaymentRequiredModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Icon */}
            <div className="h-14 w-14 bg-orange-500/10 rounded-full mx-auto flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>

            {/* Content */}
            <h3 className="text-lg font-semibold text-white text-center mb-2">
              Payment Method Required
            </h3>
            <p className="text-zinc-400 text-sm text-center mb-6">
              Please connect a payment method before activating upsells. We only charge 5% on successful upsells.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentRequiredModal(false)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPaymentRequiredModal(false);
                  handleConnectPayment();
                }}
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium transition-colors cursor-pointer"
              >
                Connect Now
              </button>
            </div>
          </div>
        </div>
      )}

      <DashboardNav companyId={companyId} />
      <div className="p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="border-b border-zinc-800 pb-6">
            <h1 className="text-3xl font-bold text-white">Dashboard & Analytics</h1>
            <p className="text-zinc-400 mt-2">
              Configure your post-purchase upsells and view performance metrics
            </p>
          </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total Revenue Card */}
          <div className="stats-card bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="stats-card-title text-zinc-400 text-sm font-medium">Total Revenue Generated</p>
                <p className="stats-card-number text-4xl font-bold text-green-500 mt-2">
                  ${billingStatus?.billing?.totalRevenueGeneratedCents
                    ? (billingStatus.billing.totalRevenueGeneratedCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : "0.00"}
                </p>
              </div>
              <div className="stats-card-icon h-12 w-12 bg-green-500/10 rounded-lg flex items-center justify-center">
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
            <p className="stats-card-footer text-zinc-500 text-sm mt-4">+${analytics.weeklyRevenue.toFixed(2)} this week</p>
          </div>

          {/* Conversion Rate Card */}
          <div className="stats-card bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="stats-card-title text-zinc-400 text-sm font-medium">Conversion Rate</p>
                <p className="stats-card-number text-4xl font-bold text-white mt-2">{analytics.conversionRate}%</p>
              </div>
              <div className="stats-card-icon h-12 w-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
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
            <p className="stats-card-footer text-zinc-500 text-sm mt-4">{analytics.totalConversions} conversions from {analytics.totalViews} views</p>
          </div>
        </div>

        {/* Billing Section */}
        <div className={`bg-zinc-900 border rounded-xl overflow-hidden ${
          billingStatus?.billing?.status === "unpaid_lockout"
            ? "border-red-500/50"
            : billingStatus?.billing?.status === "grace_period"
            ? "border-orange-500/50"
            : "border-zinc-800"
        }`}>
          <div className="p-6 border-b border-zinc-800">
            <div className="billing-header flex items-center justify-between">
              <div className="billing-header-left">
                <h2 className="text-xl font-semibold text-white">Stacker Billing</h2>
                <p className="text-zinc-400 text-sm mt-1">
                  We charge 5% on successful upsells — we only make money when you do
                </p>
              </div>
              <div className="flex items-center gap-3">
                {billingStatus?.user?.paymentMethodConnected && billingStatus?.billing?.status === "active" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm">
                    <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                    Active
                  </span>
                )}
                {billingStatus?.billing?.status === "grace_period" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-400 text-sm">
                    <span className="h-2 w-2 bg-orange-500 rounded-full animate-pulse"></span>
                    Payment Failed
                  </span>
                )}
                {billingStatus?.billing?.status === "unpaid_lockout" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-sm">
                    <span className="h-2 w-2 bg-red-500 rounded-full"></span>
                    Account Locked
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Grace Period Warning Banner */}
          {billingStatus?.billing?.status === "grace_period" && billingStatus.gracePeriod && (
            <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-orange-500/20 p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-10 w-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-orange-400 mb-1">Payment Failed - Action Required</h3>
                  <p className="text-zinc-400 text-sm mb-3">
                    Your last payment attempt failed. Please update your payment method or retry within{" "}
                    <span className="font-bold text-orange-400">
                      {billingStatus.gracePeriod.hoursRemaining > 1
                        ? `${Math.floor(billingStatus.gracePeriod.hoursRemaining)} hours`
                        : billingStatus.gracePeriod.hoursRemaining > 0
                        ? `${Math.ceil(billingStatus.gracePeriod.hoursRemaining * 60)} minutes`
                        : "soon"}
                    </span>{" "}
                    to avoid account lockout.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleRetryPayment}
                      disabled={retryingPayment}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 rounded-lg text-white font-medium text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      {retryingPayment ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Retrying...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Retry Payment
                        </>
                      )}
                    </button>
                    <button
                      onClick={handlePayNow}
                      disabled={payingNow}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-700/50 rounded-lg text-white font-medium text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      {payingNow ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Loading...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          Pay with Different Card
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lockout Warning Banner */}
          {billingStatus?.billing?.status === "unpaid_lockout" && (
            <div className="bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-red-500/20 p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-10 w-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-red-400 mb-1">Account Locked - Upsells Disabled</h3>
                  <p className="text-zinc-400 text-sm mb-3">
                    Your account has been locked due to an unpaid balance. Your upsell flow is currently disabled.
                    Please pay your outstanding balance to restore access.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handlePayNow}
                      disabled={payingNow}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 rounded-lg text-white font-medium text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      {payingNow ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Loading...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          Pay Now to Unlock
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleUpdatePaymentMethod}
                      disabled={connectingPayment}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-700/50 rounded-lg text-white font-medium text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      {connectingPayment ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Loading...
                        </>
                      ) : (
                        "Update Payment Method"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Billing Error Alert */}
          {billingError && (
            <div className="bg-red-500/10 border-b border-red-500/20 p-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <p className="text-red-400 text-sm">{billingError}</p>
                <button
                  onClick={() => setBillingError(null)}
                  className="ml-auto text-red-400 hover:text-red-300 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div className="p-6">
            {billingLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 border-2 border-zinc-700 border-t-green-500 rounded-full animate-spin"></div>
              </div>
            ) : !billingStatus?.user?.paymentMethodConnected ? (
              /* No Payment Method Connected - Show Banner */
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-12 w-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">Connect a payment method to activate upsells</h3>
                    <p className="text-zinc-400 text-sm mb-4">
                      Stacker is free to use. We only charge 5% on successful upsells made through our app.
                      Billing happens automatically every 7 days.
                    </p>
                    <button
                      onClick={handleConnectPayment}
                      disabled={connectingPayment}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 rounded-lg text-white font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      {connectingPayment ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Connecting...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Connect Payment Method
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {billingSuccess && (
                  <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                    <p className="text-green-400 text-sm">Payment method connected successfully! Refreshing...</p>
                  </div>
                )}
              </div>
            ) : (
              /* Payment Method Connected - Show Billing Info */
              <div className="space-y-6">
                {/* Billing Stats */}
                <div className="billing-stats-grid grid grid-cols-4 gap-4">
                  <div className="billing-stat-card bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <p className="text-zinc-400 text-sm">Current Bill</p>
                    <p className="billing-stat-value text-2xl font-bold text-white mt-1">
                      ${billingStatus.billing.pendingFee.toFixed(2)}
                    </p>
                  </div>
                  <div className="billing-stat-card bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <p className="text-zinc-400 text-sm">Next Payment</p>
                    <p className="billing-stat-value text-2xl font-bold text-white mt-1">
                      {billingStatus.billing.daysTillBilling > 0
                        ? `in ${billingStatus.billing.daysTillBilling} days`
                        : "Today"}
                    </p>
                  </div>
                  <div className="billing-stat-card bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <p className="text-zinc-400 text-sm">This Period</p>
                    <p className="billing-stat-value text-2xl font-bold text-white mt-1">
                      {billingStatus.billing.pendingTransactionCount} upsells
                    </p>
                  </div>
                  <div className="billing-stat-card bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <p className="text-zinc-400 text-sm">Billing Cycle</p>
                    <p className="billing-stat-value text-2xl font-bold text-white mt-1">Weekly</p>
                  </div>
                </div>

                {/* Payment Actions */}
                <div className="flex flex-wrap items-center gap-3">
                  {billingStatus.billing.pendingFee >= 0.50 && billingStatus.billing.status === "active" && (
                    <button
                      onClick={handlePayNow}
                      disabled={payingNow}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 rounded-lg text-white font-medium text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      {payingNow ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Loading...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Pay Early
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={handleUpdatePaymentMethod}
                    disabled={connectingPayment}
                    className="billing-actions-btn inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white font-medium text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    {connectingPayment ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Manage Payment Method
                      </>
                    )}
                  </button>
                </div>

                {/* Recent Transactions */}
                {billingStatus.recentTransactions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-zinc-400 mb-3">Recent Transactions</h3>
                    <div className="space-y-2">
                      {billingStatus.recentTransactions.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-3 bg-zinc-800/30 border border-zinc-800 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{t.productName}</p>
                              <p className="text-zinc-500 text-xs">
                                {new Date(t.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white text-sm">${t.saleAmount.toFixed(2)} sale</p>
                            <p className="text-green-400 text-xs">${t.feeAmount.toFixed(2)} fee</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Invoices */}
                {billingStatus.recentInvoices.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-zinc-400 mb-3">Past Invoices</h3>
                    <div className="space-y-2">
                      {billingStatus.recentInvoices.map((i) => (
                        <div
                          key={i.id}
                          className="flex items-center justify-between p-3 bg-zinc-800/30 border border-zinc-800 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                              i.status === "paid" ? "bg-green-500/10" : "bg-orange-500/10"
                            }`}>
                              {i.status === "paid" ? (
                                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">
                                {new Date(i.periodStart).toLocaleDateString()} - {new Date(i.periodEnd).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-white text-sm">${i.totalFee.toFixed(2)}</p>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              i.status === "paid"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-orange-500/20 text-orange-400"
                            }`}>
                              {i.status === "paid" ? "Paid" : i.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {billingStatus.recentTransactions.length === 0 && billingStatus.recentInvoices.length === 0 && (
                  <div className="text-center py-8">
                    <div className="h-12 w-12 bg-zinc-800 rounded-full mx-auto flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-zinc-400 text-sm">No transactions yet</p>
                    <p className="text-zinc-500 text-xs mt-1">Transactions will appear here when upsells are made</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Upsell Flows Section */}
        <div className="space-y-4">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <div>
              <h2 className="text-xl font-semibold text-white">Upsell Flows</h2>
              <p className="text-zinc-400 text-sm mt-1">
                Create up to 3 upsell flows for different products
              </p>
            </div>
            <Link
              href={`/dashboard/${companyId}/editor`}
              onClick={handleEditorClick}
              className="hidden sm:inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white text-sm font-medium transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Offer Pages
            </Link>
          </div>

          {/* Mobile Edit Button */}
          <Link
            href={`/dashboard/${companyId}/editor`}
            onClick={handleEditorClick}
            className="flex sm:hidden items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white text-sm font-medium transition-colors cursor-pointer w-full"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Offer Pages
          </Link>

          {/* Editor Mobile Message */}
          {showEditorMobileMessage && (
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-zinc-800 border border-zinc-700 rounded-lg px-6 py-4 shadow-xl max-w-[300px] text-center">
              <p className="text-white text-sm font-medium mb-1">Desktop Required</p>
              <p className="text-zinc-400 text-xs">The editor is only available on desktop devices.</p>
            </div>
          )}

          {/* Flow Accordions */}
          {(["flow1", "flow2", "flow3"] as FlowId[]).map((flowId) => {
            const flow = flows[flowId];
            const isExpanded = expandedFlows.has(flowId);
            const isSaving = flowSaving === flowId;

            return (
              <div
                key={flowId}
                className={`bg-zinc-900 border rounded-xl overflow-hidden transition-colors ${
                  flow.isActive ? "border-green-500/30" : "border-zinc-800"
                }`}
              >
                {/* Accordion Header */}
                <button
                  onClick={() => toggleFlowExpanded(flowId)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center ${
                      flow.isActive ? "bg-green-500/20" : "bg-zinc-800"
                    }`}>
                      <span className={`text-sm sm:text-base font-bold ${
                        flow.isActive ? "text-green-400" : "text-zinc-500"
                      }`}>
                        {flowId.replace("flow", "")}
                      </span>
                    </div>
                    <div className="text-left min-w-0">
                      <h3 className="text-white font-medium text-sm sm:text-base truncate">{flowNames[flowId]}</h3>
                      <p className="text-zinc-500 text-xs sm:text-sm truncate">
                        {flow.triggerProductId
                          ? products.find(p => p.id === flow.triggerProductId)?.title || "Product selected"
                          : "No trigger set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    {isSaving && (
                      <div className="h-4 w-4 border-2 border-zinc-600 border-t-green-500 rounded-full animate-spin" />
                    )}
                    {/* Active Toggle */}
                    {(() => {
                      const isToggleDisabled = billingStatus?.billing?.status === "unpaid_lockout" || !billingStatus?.user?.paymentMethodConnected;
                      return (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isToggleDisabled || flow.isActive) {
                              handleSetFlowActive(flowId, !flow.isActive);
                            }
                          }}
                          className={`flex items-center gap-2 ${isToggleDisabled && !flow.isActive ? "opacity-50 cursor-not-allowed" : ""}`}
                          title={isToggleDisabled && !flow.isActive ? (billingStatus?.billing?.status === "unpaid_lockout" ? "Pay outstanding balance to enable" : "Connect payment method to enable") : undefined}
                        >
                          <span className="text-xs sm:text-sm font-medium text-zinc-400 hidden sm:inline">
                            {flow.isActive ? "Active" : "Inactive"}
                          </span>
                          <div
                            className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-colors ${
                              isToggleDisabled && !flow.isActive ? "cursor-not-allowed" : "cursor-pointer"
                            } ${
                              flow.isActive ? "bg-green-500" : isToggleDisabled ? "bg-zinc-600" : "bg-red-500/80"
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                                flow.isActive ? "translate-x-5 sm:translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })()}
                    {/* Chevron */}
                    <svg
                      className={`w-5 h-5 text-zinc-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 p-4 sm:p-5 space-y-0">
                    {/* Step 1: Trigger */}
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                      <div className="step-card-layout flex items-start gap-3 sm:gap-4">
                        <div className="step-card-icon flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="step-card-content flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-purple-400 uppercase tracking-wide">Step 1</span>
                            <span className="text-xs text-zinc-600">•</span>
                            <span className="text-xs text-zinc-500">The Trigger</span>
                          </div>
                          <label className="text-sm font-medium text-white block mb-2">When this product is purchased...</label>
                          <Select
                            placeholder="Select trigger product..."
                            value={flow.triggerProductId}
                            onValueChange={(val) => handleSetTriggerProduct(flowId, val)}
                            size="md"
                            items={productDropdownItems}
                            className="step-card-select cursor-pointer"
                            contentClassName="bg-zinc-900 border border-zinc-700 shadow-2xl rounded-lg overflow-hidden [&_[role=option]]:px-4 [&_[role=option]]:py-3 [&_[role=option]]:border-b [&_[role=option]]:border-zinc-800 [&_[role=option]:last-child]:border-b-0 [&_[role=option]]:cursor-pointer [&_[role=option]:hover]:bg-zinc-800 [&_[role=option][data-state=checked]]:bg-zinc-800 [&_[role=option][data-state=checked]]:border-l-2 [&_[role=option][data-state=checked]]:border-l-purple-500 [&_svg]:hidden"
                          />
                          <p className="text-xs text-red-400 mt-2">
                            This must match the product users purchase to join your community.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Connector Line 1 */}
                    <div className="flex justify-start pl-7 sm:pl-9">
                      <div className="h-6 sm:h-8 w-0.5 bg-zinc-700" />
                    </div>

                    {/* Step 2: Upsell */}
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                      <div className="step-card-layout flex items-start gap-3 sm:gap-4">
                        <div className="step-card-icon flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <div className="step-card-content flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-green-400 uppercase tracking-wide">Step 2</span>
                            <span className="text-xs text-zinc-600">•</span>
                            <span className="text-xs text-zinc-500">Primary Upsell</span>
                          </div>
                          <label className="text-sm font-medium text-white block mb-2">Show this product</label>
                          <Select
                            placeholder="Select upsell product..."
                            value={flow.upsellProductId}
                            onValueChange={(val) => handleSetUpsellProduct(flowId, val)}
                            size="md"
                            items={productDropdownItems}
                            className="step-card-select cursor-pointer"
                            contentClassName="bg-zinc-900 border border-zinc-700 shadow-2xl rounded-lg overflow-hidden [&_[role=option]]:px-4 [&_[role=option]]:py-3 [&_[role=option]]:border-b [&_[role=option]]:border-zinc-800 [&_[role=option]:last-child]:border-b-0 [&_[role=option]]:cursor-pointer [&_[role=option]:hover]:bg-zinc-800 [&_[role=option][data-state=checked]]:bg-zinc-800 [&_[role=option][data-state=checked]]:border-l-2 [&_[role=option][data-state=checked]]:border-l-green-500 [&_svg]:hidden"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Connector Line 2 */}
                    <div className="flex items-center pl-7 sm:pl-9 gap-2 sm:gap-3">
                      <div className="h-6 sm:h-8 w-0.5 bg-zinc-700" />
                      <div className="flex items-center gap-2 -ml-1">
                        <div className="h-0.5 w-3 sm:w-4 bg-zinc-700" />
                        <span className="text-xs text-orange-400 bg-zinc-800 px-2 py-1 rounded border border-zinc-700">
                          If declined...
                        </span>
                      </div>
                    </div>

                    {/* Step 3: Downsell */}
                    {flow.hasDownsell ? (
                      <div className="bg-zinc-800/50 border border-orange-500/30 rounded-xl p-4">
                        <div className="step-card-layout flex items-start gap-3 sm:gap-4">
                          <div className="step-card-icon flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <div className="step-card-content flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-orange-400 uppercase tracking-wide">Step 3</span>
                                <span className="text-xs text-zinc-600">•</span>
                                <span className="text-xs text-zinc-500">Downsell</span>
                              </div>
                              <button
                                onClick={() => handleRemoveDownsellForFlow(flowId)}
                                className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                            <label className="text-sm font-medium text-white block mb-2">Show this if they decline</label>
                            <Select
                              placeholder="Select downsell product..."
                              value={flow.downsellProductId}
                              onValueChange={(val) => handleSetDownsellProduct(flowId, val)}
                              size="md"
                              items={productDropdownItems}
                              className="step-card-select cursor-pointer"
                              contentClassName="bg-zinc-900 border border-zinc-700 shadow-2xl rounded-lg overflow-hidden [&_[role=option]]:px-4 [&_[role=option]]:py-3 [&_[role=option]]:border-b [&_[role=option]]:border-zinc-800 [&_[role=option]:last-child]:border-b-0 [&_[role=option]]:cursor-pointer [&_[role=option]:hover]:bg-zinc-800 [&_[role=option][data-state=checked]]:bg-zinc-800 [&_[role=option][data-state=checked]]:border-l-2 [&_[role=option][data-state=checked]]:border-l-orange-500 [&_svg]:hidden"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddDownsell(flowId)}
                        className="w-full border-2 border-dashed border-zinc-700 hover:border-zinc-600 rounded-xl p-4 flex items-center justify-center gap-2 text-zinc-400 hover:text-zinc-300 transition-colors group cursor-pointer"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500 group-hover:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span className="text-sm font-medium">Add Downsell Offer</span>
                      </button>
                    )}

                    {/* Notification Settings for this flow */}
                    <div className="mt-6 pt-6 border-t border-zinc-700">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-white">Push Notification</h4>
                            <p className="text-xs text-zinc-500">Sent when this flow triggers</p>
                          </div>
                        </div>
                        <div
                          onClick={() => handleNotificationsEnabledChange(flowId, !flow.notificationsEnabled)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <span className="text-xs text-zinc-400 hidden sm:inline">
                            {flow.notificationsEnabled ? "On" : "Off"}
                          </span>
                          <div
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              flow.notificationsEnabled ? "bg-blue-500" : "bg-zinc-600"
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                flow.notificationsEnabled ? "translate-x-5" : "translate-x-1"
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      <div className={`space-y-3 ${!flow.notificationsEnabled ? "opacity-50 pointer-events-none" : ""}`}>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title</label>
                          <input
                            type="text"
                            value={flow.notificationTitle}
                            onChange={(e) => handleNotificationTitleChange(flowId, e.target.value)}
                            onBlur={() => handleSaveNotificationText(flowId)}
                            placeholder="Notification title..."
                            maxLength={50}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Message</label>
                          <textarea
                            value={flow.notificationContent}
                            onChange={(e) => handleNotificationContentChange(flowId, e.target.value)}
                            onBlur={() => handleSaveNotificationText(flowId)}
                            placeholder="Notification message..."
                            maxLength={100}
                            rows={2}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Your Products */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <div className="products-header flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">Your Products</h2>
                <p className="text-zinc-400 text-sm mt-1">
                  Manage which products are displayed in your store and available for upsells
                </p>
              </div>
              <button
                onClick={fetchProducts}
                disabled={productsLoading}
                className="products-sync-btn inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${productsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync from Whop
              </button>
            </div>
          </div>

          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-zinc-700 border-t-green-500 rounded-full animate-spin"></div>
            </div>
          ) : productsError ? (
            <div className="p-6 text-center">
              <div className="h-12 w-12 bg-red-500/10 rounded-full mx-auto flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-red-400 text-sm mb-2">{productsError}</p>
              <button
                onClick={fetchProducts}
                className="text-zinc-400 hover:text-white text-sm underline cursor-pointer"
              >
                Try again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="p-6 text-center">
              <div className="h-12 w-12 bg-zinc-800 rounded-full mx-auto flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-zinc-400 text-sm">No products found</p>
              <p className="text-zinc-500 text-xs mt-1">Create products in your Whop dashboard first</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="products-table w-full">
                <thead className="bg-zinc-900/50">
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-sm font-medium text-zinc-400 px-6 py-4">
                      Product
                    </th>
                    <th className="text-left text-sm font-medium text-zinc-400 px-6 py-4">
                      Price
                    </th>
                    <th className=" text-left text-sm font-medium text-zinc-400 px-6 py-4">
                      Type
                    </th>
                    <th className=" text-left text-sm font-medium text-zinc-400 px-6 py-4">
                      Status
                    </th>
                    <th className="text-center text-sm font-medium text-zinc-400 px-6 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Visible Products */}
                  {visibleProducts.map((product) => {
                    const imageUrl = productImages[product.id] || product.imageUrl;
                    const isUploading = uploadingProductId === product.id;

                    return (
                    <tr
                      key={product.id}
                      className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {/* Product Image with Upload/Edit */}
                          <div className="relative group">
                            {isUploading ? (
                              <div className="h-9 w-16 bg-zinc-700 rounded-lg flex items-center justify-center">
                                <div className="h-5 w-5 border-2 border-zinc-500 border-t-green-500 rounded-full animate-spin"></div>
                              </div>
                            ) : imageUrl ? (
                              <>
                                <img
                                  src={imageUrl}
                                  alt={product.title}
                                  className="h-9 w-16 rounded-lg object-cover"
                                />
                                {/* Edit overlay */}
                                <button
                                  onClick={() => handleImageUploadClick(product.id)}
                                  className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                  title="Change image"
                                >
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleImageUploadClick(product.id)}
                                className="h-9 w-16 bg-orange-500/20 border border-orange-500/30 rounded-lg flex items-center justify-center hover:bg-orange-500/30 transition-colors cursor-pointer group/upload"
                                title="Upload image"
                              >
                                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </button>
                            )}
                          </div>
                          <div>
                            <p className="product-title text-white font-medium">{product.title}</p>
                            {product.headline && (
                              <p className="product-desc text-zinc-500 text-xs mt-0.5 truncate max-w-[250px]">{product.headline}</p>
                            )}
                            {!imageUrl && (
                              <p className="text-orange-400 text-xs mt-0.5">Upload image</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-green-500 font-medium">{formatPrice(product.price, product.currency)}</p>
                        {product.planType === "renewal" && product.billingPeriod && (
                          <p className="text-zinc-500 text-xs">/{product.billingPeriod === 30 ? 'month' : product.billingPeriod === 365 ? 'year' : `${product.billingPeriod} days`}</p>
                        )}
                      </td>
                      <td className=" px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                          product.planType === "renewal"
                            ? "bg-purple-500/20 text-purple-400"
                            : product.planType === "free"
                            ? "bg-zinc-500/20 text-zinc-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}>
                          {product.planType === "renewal" ? "Recurring" : product.planType === "free" ? "Free" : "One Time"}
                        </span>
                      </td>
                      <td className=" px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                          <span className="h-1.5 w-1.5 bg-green-500 rounded-full"></span>
                          Visible
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleHideProduct(product.id)}
                            className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-orange-400 transition-colors cursor-pointer text-sm"
                            title="Hide from store"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                            <span className="hidden sm:inline">Hide</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                  {/* Hidden Products */}
                  {hiddenProducts.map((product) => {
                    const imageUrl = productImages[product.id] || product.imageUrl;

                    return (
                    <tr
                      key={product.id}
                      className="border-b border-zinc-800 bg-zinc-900/30 opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={product.title}
                              className="h-9 w-16 rounded-lg object-cover grayscale"
                            />
                          ) : (
                            <div className="h-9 w-16 bg-zinc-700 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <p className="product-title text-zinc-400 font-medium">{product.title}</p>
                            {product.headline && (
                              <p className="product-desc text-zinc-600 text-xs mt-0.5 truncate max-w-[250px]">{product.headline}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-zinc-500 font-medium">{formatPrice(product.price, product.currency)}</p>
                      </td>
                      <td className=" px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-zinc-700/50 text-zinc-500">
                          {product.planType === "renewal" ? "Recurring" : product.planType === "free" ? "Free" : "One Time"}
                        </span>
                      </td>
                      <td className=" px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-zinc-700/50 text-zinc-500">
                          <span className="h-1.5 w-1.5 bg-zinc-500 rounded-full"></span>
                          Hidden
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleUnhideProduct(product.id)}
                            className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-green-400 transition-colors cursor-pointer text-sm"
                            title="Show in store"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="hidden sm:inline">Show</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
