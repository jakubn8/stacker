import { NextRequest, NextResponse } from "next/server";
import { whopsdk, STACKER_COMPANY_ID } from "@/lib/whop-sdk";
import {
  getUsersDueForBilling,
  getPendingTransactions,
  createInvoice,
  updateInvoiceStatus,
  incrementInvoiceRetryCount,
  updateUserNextBillingDate,
} from "@/lib/db";
import { Timestamp } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for Vercel

// Minimum fee to charge (avoid tiny charges)
const MINIMUM_FEE_TO_CHARGE = 1.0; // $1.00

/**
 * POST /api/billing/process
 *
 * This endpoint is called by a cron job (Vercel Cron or external)
 * to process billing for all users due for payment.
 *
 * Security: Verify the request is from a trusted source
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify the cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting billing processor...");

    // Get all users due for billing
    const usersDueForBilling = await getUsersDueForBilling();
    console.log(`Found ${usersDueForBilling.length} users due for billing`);

    const results = {
      processed: 0,
      skipped: 0,
      failed: 0,
      details: [] as Array<{
        userId: string;
        status: string;
        amount?: number;
        error?: string;
      }>,
    };

    // Process each user
    for (const user of usersDueForBilling) {
      try {
        console.log(`Processing user: ${user.id}`);

        // Get pending transactions
        const pendingTransactions = await getPendingTransactions(user.id);

        if (pendingTransactions.length === 0) {
          // No transactions - just update the next billing date
          const sevenDaysFromNow = Timestamp.fromDate(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          );
          await updateUserNextBillingDate(user.id, sevenDaysFromNow);

          results.skipped++;
          results.details.push({
            userId: user.id,
            status: "skipped",
            error: "No pending transactions",
          });
          continue;
        }

        // Calculate total fee
        const totalFee = pendingTransactions.reduce(
          (sum, t) => sum + t.feeAmount,
          0
        );
        const totalSales = pendingTransactions.reduce(
          (sum, t) => sum + t.saleAmount,
          0
        );

        // Check minimum fee threshold
        if (totalFee < MINIMUM_FEE_TO_CHARGE) {
          // Fee too small - skip and don't update billing date
          // Transactions will accumulate until they meet threshold
          results.skipped++;
          results.details.push({
            userId: user.id,
            status: "skipped",
            amount: totalFee,
            error: `Fee below minimum threshold ($${MINIMUM_FEE_TO_CHARGE})`,
          });
          continue;
        }

        // Check if user has payment method
        if (!user.paymentMethodId) {
          results.skipped++;
          results.details.push({
            userId: user.id,
            status: "skipped",
            error: "No payment method connected",
          });
          continue;
        }

        // Calculate billing period
        const periodEnd = Timestamp.now();
        const periodStart = user.billingCycleStart || Timestamp.fromDate(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );

        // Create invoice
        const invoice = await createInvoice({
          userId: user.id,
          periodStart,
          periodEnd,
          totalSales: Math.round(totalSales * 100) / 100,
          totalFee: Math.round(totalFee * 100) / 100,
          transactionCount: pendingTransactions.length,
          transactionIds: pendingTransactions.map((t) => t.id),
        });

        // Update invoice to processing
        await updateInvoiceStatus(invoice.id, "processing");

        console.log(`Charging user ${user.id}: $${totalFee.toFixed(2)}`);

        // Charge the user via Whop API
        try {
          const payment = await whopsdk.payments.create({
            company_id: STACKER_COMPANY_ID,
            member_id: user.whopMemberId,
            payment_method_id: user.paymentMethodId,
            plan: {
              initial_price: Math.round(totalFee * 100), // Convert to cents
              currency: "usd",
              plan_type: "one_time",
              product: {
                title: `Stacker Fee (${formatDateRange(periodStart.toDate(), periodEnd.toDate())})`,
                // Encode invoice info in external_identifier for webhook lookup
                external_identifier: `stacker_invoice_${invoice.id}_user_${user.id}`,
              },
            },
          });

          // Store the payment ID on the invoice for tracking
          await updateInvoiceStatus(invoice.id, "processing", {
            whopPaymentId: payment.id,
          });

          console.log(`Payment created: ${payment.id}`);

          // Payment is async - webhook will update status
          results.processed++;
          results.details.push({
            userId: user.id,
            status: "processing",
            amount: totalFee,
          });
        } catch (paymentError) {
          console.error(`Payment failed for user ${user.id}:`, paymentError);

          // Mark invoice as failed
          await updateInvoiceStatus(invoice.id, "failed", {
            failureReason:
              paymentError instanceof Error
                ? paymentError.message
                : "Unknown error",
          });
          await incrementInvoiceRetryCount(invoice.id);

          results.failed++;
          results.details.push({
            userId: user.id,
            status: "failed",
            amount: totalFee,
            error:
              paymentError instanceof Error
                ? paymentError.message
                : "Unknown error",
          });
        }
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
        results.failed++;
        results.details.push({
          userId: user.id,
          status: "error",
          error:
            userError instanceof Error ? userError.message : "Unknown error",
        });
      }
    }

    console.log("Billing processor complete:", results);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalUsers: usersDueForBilling.length,
        processed: results.processed,
        skipped: results.skipped,
        failed: results.failed,
      },
      details: results.details,
    });
  } catch (error) {
    console.error("Billing processor error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for testing/debugging (returns status without processing)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify auth
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const usersDueForBilling = await getUsersDueForBilling();

    const summary = await Promise.all(
      usersDueForBilling.map(async (user) => {
        const pendingTransactions = await getPendingTransactions(user.id);
        const totalFee = pendingTransactions.reduce(
          (sum, t) => sum + t.feeAmount,
          0
        );
        return {
          userId: user.id,
          paymentMethodConnected: user.paymentMethodConnected,
          pendingTransactions: pendingTransactions.length,
          totalFee: Math.round(totalFee * 100) / 100,
          nextBillingDate: user.nextBillingDate?.toDate().toISOString(),
        };
      })
    );

    return NextResponse.json({
      usersDueForBilling: summary.length,
      users: summary,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Helper function to format date range
function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startStr = start.toLocaleDateString("en-US", options);
  const endStr = end.toLocaleDateString("en-US", options);
  return `${startStr} - ${endStr}`;
}
