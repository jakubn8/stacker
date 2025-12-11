import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getAllUsers,
  getPendingTransactions,
  getLastPaidInvoice,
  updateUserProfile,
} from "@/lib/db";
import { whopsdk } from "@/lib/whop-sdk";

export const dynamic = "force-dynamic";

const ADMIN_COOKIE_NAME = "stacker_admin_session";

interface AdminUserData {
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

/**
 * Verify admin session from cookie
 */
async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return false;
  }

  try {
    const decoded = Buffer.from(sessionCookie.value, "base64").toString();
    const [password, expiresAt] = decoded.split(":");

    const adminPassword = process.env.ADMIN_PASSWORD;

    if (password !== adminPassword) {
      return false;
    }

    if (Date.now() > parseInt(expiresAt)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * GET /api/admin/data
 * Fetch all users with billing data for admin dashboard
 */
export async function GET(): Promise<NextResponse> {
  // Verify admin session
  const isAuthenticated = await verifyAdminSession();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Get all users
    const users = await getAllUsers();

    // Build admin data for each user
    const adminUsers: AdminUserData[] = [];
    let totalPending = 0;
    let totalOverdue = 0;
    let lockoutCount = 0;
    let graceCount = 0;
    let lifetimeRevenueCents = 0;

    for (const user of users) {
      // Sum up lifetime revenue from all users
      lifetimeRevenueCents += user.totalRevenueGeneratedCents || 0;

      // Get pending transactions for this user
      const pendingTransactions = await getPendingTransactions(user.id);
      const pendingAmount = pendingTransactions.reduce(
        (sum, t) => sum + t.feeAmount,
        0
      );

      // Calculate overdue vs pending
      let overdueAmount = 0;
      let statusSince: string | null = null;

      if (user.billingStatus === "grace_period" || user.billingStatus === "unpaid_lockout") {
        overdueAmount = pendingAmount;
        statusSince = user.paymentFailedAt?.toDate().toISOString() || null;

        if (user.billingStatus === "unpaid_lockout") {
          lockoutCount++;
        } else {
          graceCount++;
        }
        totalOverdue += overdueAmount;
      } else {
        totalPending += pendingAmount;
      }

      // Calculate grace period hours remaining
      let graceHoursRemaining: number | null = null;
      if (user.billingStatus === "grace_period" && user.gracePeriodEndsAt) {
        const endsAt = user.gracePeriodEndsAt.toDate();
        const hoursLeft = (endsAt.getTime() - Date.now()) / (1000 * 60 * 60);
        graceHoursRemaining = Math.max(0, Math.round(hoursLeft * 10) / 10);
      }

      // Get last paid invoice
      const lastPaidInvoice = await getLastPaidInvoice(user.id);
      const lastPaidAt = lastPaidInvoice?.paidAt?.toDate().toISOString() || null;

      // Backfill user info from Whop API if missing
      let email = user.email;
      let username = user.username;
      let companyName = user.companyName;

      if (!username || !companyName) {
        // Try to fetch from Whop API and update user
        try {
          if (!username && user.whopUserId) {
            const whopUser = await whopsdk.users.retrieve(user.whopUserId);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const userData = whopUser as any;
            email = userData.email || email;
            username = userData.username || null;
          }
        } catch {
          // Ignore errors fetching user info
        }

        try {
          if (!companyName && user.whopCompanyId) {
            const whopCompany = await whopsdk.companies.retrieve(user.whopCompanyId);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const companyData = whopCompany as any;
            companyName = companyData.title || companyData.name || null;
          }
        } catch {
          // Ignore errors fetching company info
        }

        // Update user profile with fetched data
        if (username || companyName || (email && email !== user.email)) {
          await updateUserProfile(user.id, {
            username,
            companyName,
            email,
          });
        }
      }

      adminUsers.push({
        id: user.id,
        email: email || null,
        username: username || null,
        companyName: companyName || null,
        companyId: user.whopCompanyId,
        billingStatus: user.billingStatus,
        pendingAmount: user.billingStatus === "active" ? Math.round(pendingAmount * 100) / 100 : 0,
        overdueAmount: Math.round(overdueAmount * 100) / 100,
        nextBillingDate: user.nextBillingDate?.toDate().toISOString() || null,
        gracePeriodEndsAt: user.gracePeriodEndsAt?.toDate().toISOString() || null,
        graceHoursRemaining,
        hasPaymentMethod: user.paymentMethodConnected,
        lastPaidAt,
        statusSince,
        createdAt: user.createdAt.toDate().toISOString(),
      });
    }

    // Sort by: lockout first, then grace period, then active
    // Within each group, sort by overdue/pending amount (highest first)
    adminUsers.sort((a, b) => {
      const statusOrder = { unpaid_lockout: 0, grace_period: 1, active: 2 };
      const statusDiff = statusOrder[a.billingStatus] - statusOrder[b.billingStatus];
      if (statusDiff !== 0) return statusDiff;

      // Within same status, sort by amount (overdue for problem users, pending for active)
      const aAmount = a.billingStatus === "active" ? a.pendingAmount : a.overdueAmount;
      const bAmount = b.billingStatus === "active" ? b.pendingAmount : b.overdueAmount;
      return bAmount - aAmount;
    });

    return NextResponse.json({
      success: true,
      users: adminUsers,
      summary: {
        totalUsers: users.length,
        lockoutCount,
        graceCount,
        totalOverdue: Math.round(totalOverdue * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
        lifetimeRevenueCents,
      },
    });
  } catch (error) {
    console.error("Admin data fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch data" },
      { status: 500 }
    );
  }
}
