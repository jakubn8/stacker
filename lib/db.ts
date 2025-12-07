import { db } from "./firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

// ============================================
// TYPES
// ============================================

export interface OfferPageSettings {
  headline: string;
  subheadline: string;
  buttonText: string;
  bulletPoints: string[];
  showSocialProof: boolean;
  reviewText: string;
  reviewAuthor: string;
  reviewStars: number;
}

export interface ProductOverride {
  customTitle: string | null;
  customDescription: string | null;
  customImageUrl: string | null;
  showDiscount: boolean;
  originalPriceCents: number | null;
}

export interface FlowConfig {
  isActive: boolean;
  triggerProductId: string | null;
  upsellProductId: string | null;
  downsellProductId: string | null;
}

export interface User {
  id: string;
  whopCompanyId: string;
  whopMemberId: string;
  whopUserId: string;
  email: string | null;
  paymentMethodId: string | null;
  paymentMethodConnected: boolean;
  billingStatus: "active" | "unpaid_lockout";
  billingCycleStart: Timestamp | null;
  nextBillingDate: Timestamp | null;
  totalRevenueGeneratedCents: number;
  flowConfig: FlowConfig;
  offerPageSettings: OfferPageSettings;
  productOverrides: Record<string, ProductOverride>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Transaction {
  id: string;
  userId: string;
  whopPaymentId: string;
  productId: string;
  productName: string;
  saleAmount: number; // in dollars
  feeAmount: number; // 5% of saleAmount
  currency: string;
  status: "pending" | "invoiced";
  invoiceId: string | null;
  createdAt: Timestamp;
}

export interface Invoice {
  id: string;
  userId: string;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  totalSales: number;
  totalFee: number;
  transactionCount: number;
  transactionIds: string[];
  status: "pending" | "processing" | "paid" | "failed";
  whopPaymentId: string | null;
  failureReason: string | null;
  paidAt: Timestamp | null;
  retryCount: number;
  createdAt: Timestamp;
}

export interface StackerProduct {
  id: string;
  userId: string;
  whopProductId: string;
  whopPlanId: string | null;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  paymentType: "one_time" | "recurring";
  isUpsell: boolean;
  isDownsell: boolean;
  isTrigger: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// USER FUNCTIONS
// ============================================

export async function getUser(userId: string): Promise<User | null> {
  const doc = await db.collection("users").doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as User;
}

export async function getUserByWhopCompanyId(whopCompanyId: string): Promise<User | null> {
  const snapshot = await db
    .collection("users")
    .where("whopCompanyId", "==", whopCompanyId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as User;
}

export async function getUserByWhopUserId(whopUserId: string): Promise<User | null> {
  const snapshot = await db
    .collection("users")
    .where("whopUserId", "==", whopUserId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as User;
}

// Default settings for new users
const DEFAULT_OFFER_PAGE_SETTINGS: OfferPageSettings = {
  headline: "Wait! Your order isn't complete...",
  subheadline: "Add this exclusive offer to your purchase",
  buttonText: "Yes, Upgrade My Order",
  bulletPoints: ["Exclusive bonus content", "Priority support", "Lifetime updates"],
  showSocialProof: true,
  reviewText: "This was exactly what I needed! Highly recommend.",
  reviewAuthor: "@HappyCustomer",
  reviewStars: 5,
};

const DEFAULT_FLOW_CONFIG: FlowConfig = {
  isActive: false,
  triggerProductId: null,
  upsellProductId: null,
  downsellProductId: null,
};

export async function createUser(data: {
  whopCompanyId: string;
  whopMemberId: string;
  whopUserId: string;
  email: string | null;
}): Promise<User> {
  const now = Timestamp.now();
  const userData = {
    whopCompanyId: data.whopCompanyId,
    whopMemberId: data.whopMemberId,
    whopUserId: data.whopUserId,
    email: data.email,
    paymentMethodId: null,
    paymentMethodConnected: false,
    billingStatus: "active" as const,
    billingCycleStart: null,
    nextBillingDate: null,
    totalRevenueGeneratedCents: 0,
    flowConfig: DEFAULT_FLOW_CONFIG,
    offerPageSettings: DEFAULT_OFFER_PAGE_SETTINGS,
    productOverrides: {},
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection("users").add(userData);
  return { id: docRef.id, ...userData } as User;
}

export async function updateUserPaymentMethod(
  userId: string,
  paymentMethodId: string
): Promise<void> {
  const now = Timestamp.now();
  const sevenDaysFromNow = Timestamp.fromDate(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );

  await db.collection("users").doc(userId).update({
    paymentMethodId,
    paymentMethodConnected: true,
    billingCycleStart: now,
    nextBillingDate: sevenDaysFromNow,
    updatedAt: now,
  });
}

export async function updateUserNextBillingDate(
  userId: string,
  nextBillingDate: Timestamp
): Promise<void> {
  await db.collection("users").doc(userId).update({
    nextBillingDate,
    updatedAt: Timestamp.now(),
  });
}

export async function removeUserPaymentMethod(userId: string): Promise<void> {
  await db.collection("users").doc(userId).update({
    paymentMethodId: null,
    paymentMethodConnected: false,
    updatedAt: Timestamp.now(),
  });
}

export async function updateBillingStatus(
  userId: string,
  status: "active" | "unpaid_lockout"
): Promise<void> {
  await db.collection("users").doc(userId).update({
    billingStatus: status,
    updatedAt: Timestamp.now(),
  });
}

export async function updateFlowConfig(
  userId: string,
  flowConfig: Partial<FlowConfig>
): Promise<void> {
  const user = await getUser(userId);
  if (!user) throw new Error("User not found");

  const updatedFlowConfig = {
    ...user.flowConfig,
    ...flowConfig,
  };

  await db.collection("users").doc(userId).update({
    flowConfig: updatedFlowConfig,
    updatedAt: Timestamp.now(),
  });
}

export async function updateOfferPageSettings(
  userId: string,
  settings: Partial<OfferPageSettings>
): Promise<void> {
  const user = await getUser(userId);
  if (!user) throw new Error("User not found");

  const updatedSettings = {
    ...user.offerPageSettings,
    ...settings,
  };

  await db.collection("users").doc(userId).update({
    offerPageSettings: updatedSettings,
    updatedAt: Timestamp.now(),
  });
}

export async function updateProductOverride(
  userId: string,
  productId: string,
  override: Partial<ProductOverride>
): Promise<void> {
  const user = await getUser(userId);
  if (!user) throw new Error("User not found");

  const existingOverride = user.productOverrides[productId] || {
    customTitle: null,
    customDescription: null,
    customImageUrl: null,
    showDiscount: false,
    originalPriceCents: null,
  };

  const updatedOverrides = {
    ...user.productOverrides,
    [productId]: {
      ...existingOverride,
      ...override,
    },
  };

  await db.collection("users").doc(userId).update({
    productOverrides: updatedOverrides,
    updatedAt: Timestamp.now(),
  });
}

export async function removeProductOverride(
  userId: string,
  productId: string
): Promise<void> {
  const user = await getUser(userId);
  if (!user) throw new Error("User not found");

  const updatedOverrides = { ...user.productOverrides };
  delete updatedOverrides[productId];

  await db.collection("users").doc(userId).update({
    productOverrides: updatedOverrides,
    updatedAt: Timestamp.now(),
  });
}

export async function incrementTotalRevenue(
  userId: string,
  amountCents: number
): Promise<void> {
  await db.collection("users").doc(userId).update({
    totalRevenueGeneratedCents: FieldValue.increment(amountCents),
    updatedAt: Timestamp.now(),
  });
}

// ============================================
// TRANSACTION FUNCTIONS
// ============================================

export async function createTransaction(data: {
  userId: string;
  whopPaymentId: string;
  productId: string;
  productName: string;
  saleAmount: number;
  currency: string;
}): Promise<Transaction> {
  const feeAmount = Math.round(data.saleAmount * 0.05 * 100) / 100; // 5% fee, rounded to cents
  const now = Timestamp.now();

  const transactionData = {
    userId: data.userId,
    whopPaymentId: data.whopPaymentId,
    productId: data.productId,
    productName: data.productName,
    saleAmount: data.saleAmount,
    feeAmount,
    currency: data.currency,
    status: "pending" as const,
    invoiceId: null,
    createdAt: now,
  };

  const docRef = await db.collection("transactions").add(transactionData);
  return { id: docRef.id, ...transactionData } as Transaction;
}

export async function getPendingTransactions(userId: string): Promise<Transaction[]> {
  const snapshot = await db
    .collection("transactions")
    .where("userId", "==", userId)
    .where("status", "==", "pending")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Transaction));
}

export async function getRecentTransactions(
  userId: string,
  limit: number = 10
): Promise<Transaction[]> {
  const snapshot = await db
    .collection("transactions")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Transaction));
}

export async function markTransactionsAsInvoiced(
  transactionIds: string[],
  invoiceId: string
): Promise<void> {
  const batch = db.batch();

  for (const transactionId of transactionIds) {
    const ref = db.collection("transactions").doc(transactionId);
    batch.update(ref, { status: "invoiced", invoiceId });
  }

  await batch.commit();
}

export async function transactionExists(whopPaymentId: string): Promise<boolean> {
  const snapshot = await db
    .collection("transactions")
    .where("whopPaymentId", "==", whopPaymentId)
    .limit(1)
    .get();

  return !snapshot.empty;
}

// ============================================
// INVOICE FUNCTIONS
// ============================================

export async function createInvoice(data: {
  userId: string;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  totalSales: number;
  totalFee: number;
  transactionCount: number;
  transactionIds: string[];
}): Promise<Invoice> {
  const now = Timestamp.now();

  const invoiceData = {
    userId: data.userId,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    totalSales: data.totalSales,
    totalFee: data.totalFee,
    transactionCount: data.transactionCount,
    transactionIds: data.transactionIds,
    status: "pending" as const,
    whopPaymentId: null,
    failureReason: null,
    paidAt: null,
    retryCount: 0,
    createdAt: now,
  };

  const docRef = await db.collection("invoices").add(invoiceData);
  return { id: docRef.id, ...invoiceData } as Invoice;
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: Invoice["status"],
  additionalData?: {
    whopPaymentId?: string;
    failureReason?: string;
    paidAt?: Timestamp;
  }
): Promise<void> {
  const updateData: Record<string, unknown> = { status };

  if (additionalData?.whopPaymentId) {
    updateData.whopPaymentId = additionalData.whopPaymentId;
  }
  if (additionalData?.failureReason) {
    updateData.failureReason = additionalData.failureReason;
  }
  if (additionalData?.paidAt) {
    updateData.paidAt = additionalData.paidAt;
  }

  await db.collection("invoices").doc(invoiceId).update(updateData);
}

export async function incrementInvoiceRetryCount(invoiceId: string): Promise<void> {
  await db.collection("invoices").doc(invoiceId).update({
    retryCount: FieldValue.increment(1),
  });
}

export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  const doc = await db.collection("invoices").doc(invoiceId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Invoice;
}

export async function getRecentInvoices(
  userId: string,
  limit: number = 10
): Promise<Invoice[]> {
  const snapshot = await db
    .collection("invoices")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Invoice));
}

export async function getUsersDueForBilling(): Promise<User[]> {
  const now = Timestamp.now();

  const snapshot = await db
    .collection("users")
    .where("paymentMethodConnected", "==", true)
    .where("nextBillingDate", "<=", now)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as User));
}

export async function getInvoiceByWhopPaymentId(whopPaymentId: string): Promise<Invoice | null> {
  const snapshot = await db
    .collection("invoices")
    .where("whopPaymentId", "==", whopPaymentId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Invoice;
}

// ============================================
// PRODUCT FUNCTIONS (for tracking upsells)
// ============================================

export async function saveStackerProduct(data: {
  userId: string;
  whopProductId: string;
  whopPlanId: string | null;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  paymentType: "one_time" | "recurring";
  isUpsell?: boolean;
  isDownsell?: boolean;
  isTrigger?: boolean;
}): Promise<StackerProduct> {
  const now = Timestamp.now();

  const productData = {
    userId: data.userId,
    whopProductId: data.whopProductId,
    whopPlanId: data.whopPlanId,
    name: data.name,
    description: data.description,
    price: data.price,
    currency: data.currency,
    paymentType: data.paymentType,
    isUpsell: data.isUpsell || false,
    isDownsell: data.isDownsell || false,
    isTrigger: data.isTrigger || false,
    createdAt: now,
    updatedAt: now,
  };

  // Use whopProductId as document ID for easy lookup
  await db.collection("products").doc(data.whopProductId).set(productData);
  return { id: data.whopProductId, ...productData } as StackerProduct;
}

export async function getStackerProduct(whopProductId: string): Promise<StackerProduct | null> {
  const doc = await db.collection("products").doc(whopProductId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as StackerProduct;
}

export async function getUserProducts(userId: string): Promise<StackerProduct[]> {
  const snapshot = await db
    .collection("products")
    .where("userId", "==", userId)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as StackerProduct));
}

export async function isStackerUpsell(whopProductId: string): Promise<boolean> {
  const product = await getStackerProduct(whopProductId);
  return product?.isUpsell || product?.isDownsell || false;
}

export async function updateProductRole(
  whopProductId: string,
  role: { isUpsell?: boolean; isDownsell?: boolean; isTrigger?: boolean }
): Promise<void> {
  await db.collection("products").doc(whopProductId).update({
    ...role,
    updatedAt: Timestamp.now(),
  });
}

// ============================================
// BILLING SUMMARY FUNCTIONS
// ============================================

export async function getBillingSummary(userId: string): Promise<{
  pendingFee: number;
  pendingTransactionCount: number;
  nextBillingDate: Date | null;
  daysTillBilling: number;
}> {
  const user = await getUser(userId);
  const pendingTransactions = await getPendingTransactions(userId);

  const pendingFee = pendingTransactions.reduce((sum, t) => sum + t.feeAmount, 0);
  const pendingTransactionCount = pendingTransactions.length;

  let nextBillingDate: Date | null = null;
  let daysTillBilling = 0;

  if (user?.nextBillingDate) {
    nextBillingDate = user.nextBillingDate.toDate();
    const now = new Date();
    daysTillBilling = Math.max(
      0,
      Math.ceil((nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
  }

  return {
    pendingFee: Math.round(pendingFee * 100) / 100,
    pendingTransactionCount,
    nextBillingDate,
    daysTillBilling,
  };
}
