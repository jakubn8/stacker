"use client";

import { useState, useEffect } from "react";

interface AdminUser {
  id: string;
  email: string | null;
  username: string | null;
  companyName: string | null;
  companyId: string;
  billingStatus: "active" | "grace_period" | "unpaid_lockout";
  pendingAmount: number;
  overdueAmount: number;
  nextBillingDate: string | null;
  gracePeriodEndsAt: string | null;
  graceHoursRemaining: number | null;
  hasPaymentMethod: boolean;
  lastPaidAt: string | null;
  statusSince: string | null;
  createdAt: string;
}

interface Summary {
  totalUsers: number;
  lockoutCount: number;
  graceCount: number;
  totalOverdue: number;
  totalPending: number;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filter, setFilter] = useState<"all" | "problems">("problems");

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/login");
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
      if (data.authenticated) {
        fetchData();
      } else {
        setLoading(false);
      }
    } catch {
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);
      setPassword("");
      fetchData();
    } catch {
      setLoginError("Login failed");
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setIsAuthenticated(false);
    setUsers([]);
    setSummary(null);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/data");
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthenticated(false);
        }
        return;
      }

      setUsers(data.users);
      setSummary(data.summary);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  const formatTimeRemaining = (hours: number | null) => {
    if (hours === null) return null;
    if (hours <= 0) return "Expired";
    if (hours < 1) return `${Math.round(hours * 60)}m left`;
    return `${Math.round(hours)}h left`;
  };

  const getDueStatus = (user: AdminUser) => {
    if (user.billingStatus === "unpaid_lockout") {
      return { text: "Locked", class: "text-red-400" };
    }
    if (user.billingStatus === "grace_period") {
      const timeLeft = formatTimeRemaining(user.graceHoursRemaining);
      return { text: timeLeft || "Grace", class: "text-orange-400" };
    }
    if (user.nextBillingDate) {
      const date = new Date(user.nextBillingDate);
      const daysUntil = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 0) return { text: "Due now", class: "text-yellow-400" };
      if (daysUntil === 1) return { text: "Tomorrow", class: "text-zinc-300" };
      return { text: `in ${daysUntil}d`, class: "text-zinc-400" };
    }
    return { text: "—", class: "text-zinc-500" };
  };

  const filteredUsers = filter === "all"
    ? users
    : users.filter((u) => u.billingStatus !== "active");

  // Login form
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h1 className="text-xl font-semibold text-white mb-1">Stacker Admin</h1>
            <p className="text-zinc-500 text-sm mb-6">Enter password to continue</p>

            <form onSubmit={handleLogin}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 mb-3"
                autoFocus
              />

              {loginError && (
                <p className="text-red-400 text-sm mb-3">{loginError}</p>
              )}

              <button
                type="submit"
                disabled={loading || !password}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-zinc-700 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Stacker Admin</h1>
            <p className="text-zinc-500 text-sm">Billing Overview</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-red-400 text-2xl font-bold">{summary.lockoutCount}</div>
              <div className="text-zinc-500 text-sm">Lockout</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-orange-400 text-2xl font-bold">{summary.graceCount}</div>
              <div className="text-zinc-500 text-sm">Grace Period</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-red-400 text-2xl font-bold">${summary.totalOverdue.toFixed(2)}</div>
              <div className="text-zinc-500 text-sm">Overdue</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-green-400 text-2xl font-bold">${summary.totalPending.toFixed(2)}</div>
              <div className="text-zinc-500 text-sm">Pending</div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setFilter("problems")}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === "problems"
                ? "bg-purple-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Problems Only
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === "all"
                ? "bg-purple-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            All Users ({summary?.totalUsers || 0})
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left">
                  <th className="px-4 py-3 text-zinc-400 font-medium">User</th>
                  <th className="px-4 py-3 text-zinc-400 font-medium">Company</th>
                  <th className="px-4 py-3 text-zinc-400 font-medium">Status</th>
                  <th className="px-4 py-3 text-zinc-400 font-medium">Pending</th>
                  <th className="px-4 py-3 text-zinc-400 font-medium">Overdue</th>
                  <th className="px-4 py-3 text-zinc-400 font-medium">Due</th>
                  <th className="px-4 py-3 text-zinc-400 font-medium">Payment</th>
                  <th className="px-4 py-3 text-zinc-400 font-medium">Last Paid</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                      {filter === "problems"
                        ? "No billing issues found"
                        : "No users found"}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const dueStatus = getDueStatus(user);
                    return (
                      <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-4 py-3">
                          <div className="text-white">{user.username || "—"}</div>
                          <div className="text-zinc-500 text-xs">{user.email || "No email"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-zinc-300">{user.companyName || "—"}</div>
                          <div className="text-zinc-600 text-xs font-mono">{user.companyId}</div>
                        </td>
                        <td className="px-4 py-3">
                          {user.billingStatus === "active" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400">
                              Active
                            </span>
                          )}
                          {user.billingStatus === "grace_period" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-500/10 text-orange-400">
                              Grace
                            </span>
                          )}
                          {user.billingStatus === "unpaid_lockout" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400">
                              Lockout
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-300">
                          {user.pendingAmount > 0 ? `$${user.pendingAmount.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {user.overdueAmount > 0 ? (
                            <span className="text-red-400 font-medium">${user.overdueAmount.toFixed(2)}</span>
                          ) : (
                            <span className="text-zinc-500">—</span>
                          )}
                        </td>
                        <td className={`px-4 py-3 ${dueStatus.class}`}>
                          {dueStatus.text}
                        </td>
                        <td className="px-4 py-3">
                          {user.hasPaymentMethod ? (
                            <span className="text-green-400">Yes</span>
                          ) : (
                            <span className="text-red-400">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {formatDate(user.lastPaidAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
