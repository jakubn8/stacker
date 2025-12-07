"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Button,
  Select,
} from "@whop/frosted-ui";
import { useAuth } from "@/lib/auth-context";
import DashboardNav from "@/components/DashboardNav";

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

  // Get the whopUserId from auth context, fall back to demo for development
  const whopUserId = authUser?.whopUserId || `demo_user_${companyId}`;

  // Flow configuration state
  const [isActive, setIsActive] = useState(false);
  const [triggerProduct, setTriggerProduct] = useState("");
  const [upsellProduct, setUpsellProduct] = useState("");
  const [hasDownsell, setHasDownsell] = useState(false);
  const [downsellProduct, setDownsellProduct] = useState("");
  const [flowConfigLoading, setFlowConfigLoading] = useState(true);
  const [flowSaving, setFlowSaving] = useState(false);

  // Notification settings state
  const [notificationTitle, setNotificationTitle] = useState("🎁 Wait! Your order isn't complete...");
  const [notificationContent, setNotificationContent] = useState("You unlocked an exclusive offer! Tap to claim it now.");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationSaving, setNotificationSaving] = useState(false);

  // Hidden products (stored locally, will be persisted to DB)
  const [hiddenProductIds, setHiddenProductIds] = useState<Set<string>>(new Set());

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

  // Fetch products from Whop - use auth context company ID, or URL param if it's a real biz_xxx ID
  const realCompanyId = authUser?.whopCompanyId || (companyId.startsWith("biz_") ? companyId : null);

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
  const fetchFlowConfig = useCallback(async () => {
    try {
      setFlowConfigLoading(true);
      const response = await fetch(`/api/flow/settings?whopUserId=${whopUserId}`);

      if (response.ok) {
        const data = await response.json();
        if (data.flowConfig) {
          setIsActive(data.flowConfig.isActive || false);
          setTriggerProduct(data.flowConfig.triggerProductId || "");
          setUpsellProduct(data.flowConfig.upsellProductId || "");
          setDownsellProduct(data.flowConfig.downsellProductId || "");
          setHasDownsell(!!data.flowConfig.downsellProductId);
        }
        if (data.hiddenProductIds) {
          setHiddenProductIds(new Set(data.hiddenProductIds));
        }
        // Load notification settings
        if (data.notificationSettings) {
          setNotificationTitle(data.notificationSettings.title || "🎁 Wait! Your order isn't complete...");
          setNotificationContent(data.notificationSettings.content || "You unlocked an exclusive offer! Tap to claim it now.");
          setNotificationsEnabled(data.notificationSettings.enabled !== false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch flow config:", error);
    } finally {
      setFlowConfigLoading(false);
    }
  }, [whopUserId]);

  useEffect(() => {
    fetchFlowConfig();
  }, [fetchFlowConfig]);

  // Save notification settings
  const saveNotificationSettings = useCallback(async (settings: {
    title?: string;
    content?: string;
    enabled?: boolean;
  }) => {
    try {
      setNotificationSaving(true);
      const response = await fetch("/api/notifications/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whopUserId,
          settings,
        }),
      });

      if (!response.ok) {
        console.error("Failed to save notification settings");
      }
    } catch (error) {
      console.error("Failed to save notification settings:", error);
    } finally {
      setNotificationSaving(false);
    }
  }, [whopUserId]);

  // Save flow config to database
  const saveFlowConfig = useCallback(async (config: {
    isActive?: boolean;
    triggerProductId?: string | null;
    upsellProductId?: string | null;
    downsellProductId?: string | null;
  }) => {
    try {
      setFlowSaving(true);
      const response = await fetch("/api/flow/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whopUserId,
          flowConfig: config,
        }),
      });

      if (!response.ok) {
        console.error("Failed to save flow config");
      }
    } catch (error) {
      console.error("Failed to save flow config:", error);
    } finally {
      setFlowSaving(false);
    }
  }, [whopUserId]);

  // Handlers that save to database
  const handleSetIsActive = (active: boolean) => {
    setIsActive(active);
    saveFlowConfig({ isActive: active });
  };

  const handleSetTriggerProduct = (productId: string) => {
    setTriggerProduct(productId);
    saveFlowConfig({ triggerProductId: productId || null });
  };

  const handleSetUpsellProduct = (productId: string) => {
    setUpsellProduct(productId);
    saveFlowConfig({ upsellProductId: productId || null });
  };

  const handleSetDownsellProduct = (productId: string) => {
    setDownsellProduct(productId);
    saveFlowConfig({ downsellProductId: productId || null });
  };

  const handleAddDownsell = () => {
    setHasDownsell(true);
  };

  // Notification settings handlers
  const handleNotificationTitleChange = (value: string) => {
    setNotificationTitle(value);
  };

  const handleNotificationContentChange = (value: string) => {
    setNotificationContent(value);
  };

  const handleNotificationsEnabledChange = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    saveNotificationSettings({ enabled });
  };

  const handleSaveNotificationText = () => {
    saveNotificationSettings({
      title: notificationTitle,
      content: notificationContent,
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

  const handleHideProduct = (productId: string) => {
    setHiddenProductIds((prev) => new Set([...prev, productId]));
    // TODO: Persist to database
  };

  const handleUnhideProduct = (productId: string) => {
    setHiddenProductIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
    // TODO: Persist to database
  };

  // Filter products into visible and hidden
  const visibleProducts = products.filter((p) => !hiddenProductIds.has(p.id));
  const hiddenProducts = products.filter((p) => hiddenProductIds.has(p.id));

  const handleRemoveDownsell = () => {
    setHasDownsell(false);
    setDownsellProduct("");
    saveFlowConfig({ downsellProductId: null });
  };

  return (
    <div className="min-h-screen bg-zinc-950">
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm font-medium">Total Revenue Generated</p>
                <p className="text-4xl font-bold text-green-500 mt-2">
                  ${billingStatus?.billing?.totalRevenueGeneratedCents
                    ? (billingStatus.billing.totalRevenueGeneratedCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : "0.00"}
                </p>
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
            <p className="text-zinc-500 text-sm mt-4">+${analytics.weeklyRevenue.toFixed(2)} this week</p>
          </div>

          {/* Conversion Rate Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm font-medium">Conversion Rate</p>
                <p className="text-4xl font-bold text-white mt-2">{analytics.conversionRate}%</p>
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
            <p className="text-zinc-500 text-sm mt-4">{analytics.totalConversions} conversions from {analytics.totalViews} views</p>
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
            <div className="flex items-center justify-between">
              <div>
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
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <p className="text-zinc-400 text-sm">Current Bill</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      ${billingStatus.billing.pendingFee.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <p className="text-zinc-400 text-sm">Next Payment</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {billingStatus.billing.daysTillBilling > 0
                        ? `in ${billingStatus.billing.daysTillBilling} days`
                        : "Today"}
                    </p>
                  </div>
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <p className="text-zinc-400 text-sm">This Period</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {billingStatus.billing.pendingTransactionCount} upsells
                    </p>
                  </div>
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                    <p className="text-zinc-400 text-sm">Billing Cycle</p>
                    <p className="text-2xl font-bold text-white mt-1">Weekly</p>
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
                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white font-medium text-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
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
                  onClick={() => handleSetIsActive(!isActive)}
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
                  onValueChange={handleSetTriggerProduct}
                  size="md"
                  items={productDropdownItems}
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
                  onValueChange={handleSetUpsellProduct}
                  size="md"
                  items={productDropdownItems}
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
                    onValueChange={handleSetDownsellProduct}
                    size="md"
                    items={productDropdownItems}
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
              onClick={handleAddDownsell}
              className="w-full border-2 border-dashed border-zinc-700 hover:border-zinc-600 rounded-xl p-5 flex items-center justify-center gap-2 text-zinc-400 hover:text-zinc-300 transition-colors group cursor-pointer"
            >
              <svg className="w-5 h-5 text-zinc-500 group-hover:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-sm font-medium">Add Downsell Offer</span>
            </button>
          )}
        </div>

        {/* Notification Settings */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Push Notification</h2>
                  <p className="text-zinc-400 text-sm mt-1">
                    Customize the notification sent when a customer triggers your upsell flow
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-zinc-400">
                  {notificationsEnabled ? "Enabled" : "Disabled"}
                </span>
                <button
                  onClick={() => handleNotificationsEnabledChange(!notificationsEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    notificationsEnabled ? "bg-blue-500" : "bg-zinc-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationsEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className={`p-6 space-y-4 ${!notificationsEnabled ? "opacity-50 pointer-events-none" : ""}`}>
            {/* Title Input */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Notification Title
              </label>
              <input
                type="text"
                value={notificationTitle}
                onChange={(e) => handleNotificationTitleChange(e.target.value)}
                onBlur={handleSaveNotificationText}
                placeholder="🎁 Wait! Your order isn't complete..."
                maxLength={50}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <p className="text-xs text-zinc-500 mt-1.5">
                {notificationTitle.length}/50 characters • Shows as the notification headline
              </p>
            </div>

            {/* Content Input */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Notification Message
              </label>
              <textarea
                value={notificationContent}
                onChange={(e) => handleNotificationContentChange(e.target.value)}
                onBlur={handleSaveNotificationText}
                placeholder="You unlocked an exclusive offer! Tap to claim it now."
                maxLength={100}
                rows={2}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
              <p className="text-xs text-zinc-500 mt-1.5">
                {notificationContent.length}/100 characters • Body text of the push notification
              </p>
            </div>

            {/* Preview */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-zinc-300 mb-3">
                Preview
              </label>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-sm">W</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-white text-sm font-semibold">Whop</span>
                      <span className="text-zinc-500 text-xs">now</span>
                    </div>
                    <p className="text-white text-sm font-medium truncate">{notificationTitle || "Notification Title"}</p>
                    <p className="text-zinc-400 text-sm truncate">{notificationContent || "Notification message..."}</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-2 text-center">
                This notification appears in the Whop app and as a push notification
              </p>
            </div>
          </div>

          {/* Saving Indicator */}
          {notificationSaving && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <div className="h-4 w-4 border-2 border-zinc-600 border-t-blue-500 rounded-full animate-spin"></div>
                Saving...
              </div>
            </div>
          )}
        </div>

        {/* Your Products */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Your Products</h2>
                <p className="text-zinc-400 text-sm mt-1">
                  Manage which products are displayed in your store and available for upsells
                </p>
              </div>
              <button
                onClick={fetchProducts}
                disabled={productsLoading}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white text-sm transition-colors cursor-pointer disabled:opacity-50"
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
              <table className="w-full">
                <thead className="bg-zinc-900/50">
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-sm font-medium text-zinc-400 px-6 py-4">
                      Product
                    </th>
                    <th className="text-left text-sm font-medium text-zinc-400 px-6 py-4">
                      Price
                    </th>
                    <th className="text-left text-sm font-medium text-zinc-400 px-6 py-4">
                      Type
                    </th>
                    <th className="text-left text-sm font-medium text-zinc-400 px-6 py-4">
                      Status
                    </th>
                    <th className="text-center text-sm font-medium text-zinc-400 px-6 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Visible Products */}
                  {visibleProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.title}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-zinc-700 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium">{product.title}</p>
                            {product.headline && (
                              <p className="text-zinc-500 text-xs mt-0.5 truncate max-w-[250px]">{product.headline}</p>
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
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                          <span className="h-1.5 w-1.5 bg-green-500 rounded-full"></span>
                          Visible
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleHideProduct(product.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-orange-400 transition-colors cursor-pointer text-sm"
                            title="Hide from store"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                            Hide
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* Hidden Products */}
                  {hiddenProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-zinc-800 bg-zinc-900/30 opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.title}
                              className="h-10 w-10 rounded-lg object-cover grayscale"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-zinc-700 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <p className="text-zinc-400 font-medium">{product.title}</p>
                            {product.headline && (
                              <p className="text-zinc-600 text-xs mt-0.5 truncate max-w-[250px]">{product.headline}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-zinc-500 font-medium">{formatPrice(product.price, product.currency)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-zinc-700/50 text-zinc-500">
                          {product.planType === "renewal" ? "Recurring" : product.planType === "free" ? "Free" : "One Time"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-zinc-700/50 text-zinc-500">
                          <span className="h-1.5 w-1.5 bg-zinc-500 rounded-full"></span>
                          Hidden
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleUnhideProduct(product.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-green-400 transition-colors cursor-pointer text-sm"
                            title="Show in store"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Show
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
