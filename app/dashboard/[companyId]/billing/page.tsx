"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";
import { useAuth } from "@/lib/auth-context";

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

export default function BillingPortalPage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const { user: authUser } = useAuth();

  const whopUserId = authUser?.whopUserId || "";

  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectingPayment, setConnectingPayment] = useState(false);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBillingStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/billing/status?whopUserId=${whopUserId}`);

      if (response.ok) {
        const data = await response.json();
        setBillingStatus(data);
      } else if (response.status === 404) {
        setBillingStatus(null);
      }
    } catch (err) {
      console.error("Failed to fetch billing status:", err);
    } finally {
      setLoading(false);
    }
  }, [whopUserId]);

  useEffect(() => {
    fetchBillingStatus();
  }, [fetchBillingStatus]);

  const handleConnectPayment = async () => {
    try {
      setConnectingPayment(true);
      setError(null);

      const response = await fetch("/api/billing/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whopUserId: whopUserId,
          whopCompanyId: companyId,
        }),
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.alreadyConnected) {
        fetchBillingStatus();
      }
    } catch (err) {
      console.error("Failed to setup billing:", err);
      setError("Failed to connect payment method. Please try again.");
    } finally {
      setConnectingPayment(false);
    }
  };

  const handleRetryPayment = async () => {
    try {
      setRetryingPayment(true);
      setError(null);

      const response = await fetch("/api/billing/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whopUserId: whopUserId }),
      });

      const data = await response.json();

      if (data.success) {
        // Payment is processed async by Whop - poll for status change
        const pollForStatusChange = async (attempts = 0): Promise<void> => {
          if (attempts >= 5) {
            // Max attempts reached, just fetch current status
            await fetchBillingStatus();
            setRetryingPayment(false);
            return;
          }

          // Wait 2 seconds between polls
          await new Promise(resolve => setTimeout(resolve, 2000));

          try {
            const statusResponse = await fetch(`/api/billing/status?whopUserId=${whopUserId}`);
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (statusData.billing?.status === "active") {
                // Payment succeeded! Update UI
                setBillingStatus(statusData);
                setRetryingPayment(false);
                return;
              }
            }
          } catch {
            // Ignore polling errors
          }

          // Continue polling
          await pollForStatusChange(attempts + 1);
        };

        await pollForStatusChange();
      } else {
        setError(data.error || "Payment retry failed. Please try a different card.");
        setRetryingPayment(false);
      }
    } catch (err) {
      console.error("Failed to retry payment:", err);
      setError("Failed to retry payment. Please try again.");
      setRetryingPayment(false);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    try {
      setConnectingPayment(true);
      setError(null);

      const response = await fetch("/api/billing/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whopUserId: whopUserId,
          whopCompanyId: companyId,
          updateExisting: true,
        }),
      });

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      console.error("Failed to update payment method:", err);
      setError("Failed to update payment method. Please try again.");
    } finally {
      setConnectingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
        <DashboardNav companyId={companyId} />
        <div className="flex items-center justify-center p-6 min-h-[60vh]">
          <div className="h-8 w-8 border-2 border-gray-300 dark:border-zinc-700 border-t-green-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <DashboardNav companyId={companyId} />
      <div className="p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back Link */}
          <Link
            href={`/dashboard/${companyId}`}
            className="inline-flex items-center gap-2 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>

          {/* Header */}
          <div className="border-b border-gray-200 dark:border-zinc-800 pb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Billing Portal</h1>
            <p className="text-gray-500 dark:text-zinc-400 mt-2">
              Manage your billing, view invoices, and track your Stacker fees
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <p className="text-red-400">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-300 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Grace Period Warning */}
          {billingStatus?.billing?.status === "grace_period" && billingStatus.gracePeriod && (
            <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-12 w-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-orange-400 mb-1">Payment Failed - Action Required</h3>
                  <p className="text-gray-500 dark:text-zinc-400 mb-4">
                    Your last payment attempt failed. Please update your payment method or retry within{" "}
                    <span className="font-bold text-orange-400">
                      {billingStatus.gracePeriod.hoursRemaining > 1
                        ? `${Math.floor(billingStatus.gracePeriod.hoursRemaining)} hours`
                        : `${Math.ceil(billingStatus.gracePeriod.hoursRemaining * 60)} minutes`}
                    </span>{" "}
                    to avoid account lockout.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleRetryPayment}
                      disabled={retryingPayment}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 rounded-lg text-white font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      {retryingPayment ? "Processing..." : "Retry Payment"}
                    </button>
                    <button
                      onClick={handleUpdatePaymentMethod}
                      disabled={connectingPayment}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      {connectingPayment ? "Loading..." : "Update Payment Method"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lockout Warning */}
          {billingStatus?.billing?.status === "unpaid_lockout" && (
            <div className="bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-12 w-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-400 mb-1">Account Locked - Upsells Disabled</h3>
                  <p className="text-gray-500 dark:text-zinc-400 mb-4">
                    Your account has been locked due to an unpaid balance. Your upsell flow is currently disabled.
                    Please pay your outstanding balance to restore access.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleRetryPayment}
                      disabled={retryingPayment}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 rounded-lg text-white font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      {retryingPayment ? "Processing..." : "Retry Payment"}
                    </button>
                    <button
                      onClick={handleUpdatePaymentMethod}
                      disabled={connectingPayment}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      {connectingPayment ? "Loading..." : "Update Payment Method"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Billing Content */}
          {!billingStatus?.user?.paymentMethodConnected ? (
            /* No Payment Method - Connect CTA */
            <div className="bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-green-500/20 rounded-2xl p-8">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 h-16 w-16 bg-green-500/20 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connect a Payment Method</h2>
                  <p className="text-gray-500 dark:text-zinc-400 mb-6">
                    Stacker is free to use. We only charge <span className="text-green-400 font-semibold">5%</span> on successful upsells made through our app.
                    Billing happens automatically every 7 days.
                  </p>
                  <button
                    onClick={handleConnectPayment}
                    disabled={connectingPayment}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 rounded-xl text-white font-semibold text-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    {connectingPayment ? (
                      <>
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Connect Payment Method
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Payment Method Connected - Show Full Billing Portal */
            <>
              {/* Billing Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
                  <p className="text-gray-500 dark:text-zinc-400 text-sm mb-1">Current Bill</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    ${billingStatus.billing.pendingFee.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
                  <p className="text-gray-500 dark:text-zinc-400 text-sm mb-1">Next Payment</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {billingStatus.billing.daysTillBilling > 0
                      ? `${billingStatus.billing.daysTillBilling} ${billingStatus.billing.daysTillBilling === 1 ? "Day" : "Days"}`
                      : "Today"}
                  </p>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
                  <p className="text-gray-500 dark:text-zinc-400 text-sm mb-1">Upsells This Period</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {billingStatus.billing.pendingTransactionCount}
                  </p>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
                  <p className="text-gray-500 dark:text-zinc-400 text-sm mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-500">
                    ${(billingStatus.billing.totalRevenueGeneratedCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Payment Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleUpdatePaymentMethod}
                  disabled={connectingPayment}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {connectingPayment ? "Loading..." : "Update Payment Method"}
                </button>
              </div>

              {/* Recent Transactions */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-5 border-b border-gray-200 dark:border-zinc-800">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
                  <p className="text-gray-500 dark:text-zinc-500 text-sm">Sales that will be included in your next invoice</p>
                </div>
                {billingStatus.recentTransactions.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="h-12 w-12 bg-gray-100 dark:bg-zinc-800 rounded-full mx-auto flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-gray-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-gray-500 dark:text-zinc-400">No transactions yet</p>
                    <p className="text-gray-400 dark:text-zinc-500 text-sm mt-1">Transactions will appear here when upsells are made</p>
                  </div>
                ) : (
                  <div className="max-h-[216px] overflow-y-auto">
                    <div className="divide-y divide-gray-200 dark:divide-zinc-800">
                      {billingStatus.recentTransactions.map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-gray-900 dark:text-white font-medium">{t.productName}</p>
                              <p className="text-gray-500 dark:text-zinc-500 text-sm">
                                {new Date(t.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-900 dark:text-white font-medium">${t.saleAmount.toFixed(2)} sale</p>
                            <p className="text-green-400 text-sm">${t.feeAmount.toFixed(2)} fee</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Past Invoices */}
              {billingStatus.recentInvoices.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <div className="p-5 border-b border-gray-200 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Past Invoices</h2>
                  </div>
                  <div className="max-h-[216px] overflow-y-auto">
                    <div className="divide-y divide-gray-200 dark:divide-zinc-800">
                      {billingStatus.recentInvoices.map((i) => (
                      <div key={i.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            i.status === "paid" ? "bg-green-500/10" : "bg-orange-500/10"
                          }`}>
                            {i.status === "paid" ? (
                              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-900 dark:text-white font-medium">
                              {new Date(i.periodStart).toLocaleDateString()} - {new Date(i.periodEnd).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-gray-900 dark:text-white font-medium">${i.totalFee.toFixed(2)}</p>
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
                </div>
              )}
            </>
          )}

          {/* Info Section */}
          <div className="bg-gray-100/50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
            <h3 className="text-gray-900 dark:text-white font-semibold mb-3">How Stacker Billing Works</h3>
            <ul className="space-y-2 text-gray-500 dark:text-zinc-400 text-sm">
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>We charge <strong className="text-gray-900 dark:text-white">5%</strong> on successful upsells only - we only make money when you do</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Billing happens automatically every <strong className="text-gray-900 dark:text-white">7 days</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Minimum charge is <strong className="text-gray-900 dark:text-white">$0.50</strong> - smaller amounts roll over</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>48-hour grace period if a payment fails before upsells are disabled</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
