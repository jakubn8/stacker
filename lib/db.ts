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
  // Discount price display (crossed-out "was" price)
  showDiscountPrice: boolean;
  discountPrice: number; // The "original" price to show crossed out
  // Custom product description (admin-defined, not imported from Whop)
  productDescription: string;
}

// Separate settings for upsell and downsell offers
export interface FlowOfferSettings {
  upsell: OfferPageSettings;
  downsell: OfferPageSettings;
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

export interface NotificationSettings {
  title: string;
  content: string;
  enabled: boolean;
}

// Single upsell flow with all its config
export interface UpsellFlow {
  isActive: boolean;
  triggerProductId: string | null;
  upsellProductId: string | null;
  downsellProductId: string | null;
  notificationSettings: NotificationSettings;
  offerSettings: FlowOfferSettings;
}

// All flows for a user (up to 3)
export interface UserFlows {
  flow1: UpsellFlow;
  flow2: UpsellFlow;
  flow3: UpsellFlow;
}

export type FlowId = "flow1" | "flow2" | "flow3";

export interface AnalyticsData {
  totalViews: number;
  totalConversions: number;
  weeklyViews: number;
  weeklyConversions: number;
  weeklyRevenueGeneratedCents: number;
  lastResetAt: Timestamp; // When weekly stats were last reset
}

export interface User {
  id: string;
  whopCompanyId: string;
  whopMemberId: string;
  whopUserId: string;
  email: string | null;
  paymentMethodId: string | null;
  paymentMethodConnected: boolean;
  billingStatus: "active" | "grace_period" | "unpaid_lockout";
  billingCycleStart: Timestamp | null;
  nextBillingDate: Timestamp | null;
  // Grace period tracking
  paymentFailedAt: Timestamp | null;
  gracePeriodEndsAt: Timestamp | null;
  lastFailedInvoiceId: string | null;
  totalRevenueGeneratedCents: number;
  // Analytics tracking
  analytics: AnalyticsData;
  // NEW: Multiple upsell flows (up to 3)
  flows?: UserFlows;
  // Legacy fields - kept for backwards compatibility during migration
  flowConfig: FlowConfig;
  offerSettings: FlowOfferSettings;
  notificationSettings: NotificationSettings;
  // Hidden products (not shown in storefront)
  hiddenProductIds: string[];
  // Synced products (eligible for 5% fee - upsells, downsells, storefront)
  // Does NOT include trigger products (those are sold on Whop, not through Stacker)
  syncedProductIds: string[];
  // Custom product images (productId -> imageUrl)
  productImages: Record<string, string>;
  // Legacy field - kept for backwards compatibility
  productOverrides: Record<string, ProductOverride>;
  // Whop experience ID for this company's Stacker app instance (for notifications)
  experienceId?: string;
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

/**
 * Get the stored experienceId for a company
 */
export async function getExperienceIdByCompanyId(whopCompanyId: string): Promise<string | null> {
  const user = await getUserByWhopCompanyId(whopCompanyId);
  return user?.experienceId || null;
}

/**
 * Save the experienceId for a company (called when user accesses the Stacker app)
 */
export async function saveExperienceIdForCompany(whopCompanyId: string, experienceId: string): Promise<void> {
  const user = await getUserByWhopCompanyId(whopCompanyId);
  if (!user) {
    console.log("Cannot save experienceId: user not found for company:", whopCompanyId);
    return;
  }

  // Only update if different (avoid unnecessary writes)
  if (user.experienceId !== experienceId) {
    await db.collection("users").doc(user.id).update({
      experienceId,
      updatedAt: Timestamp.now(),
    });
    console.log("Saved experienceId for company:", whopCompanyId, "->", experienceId);
  }
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
const DEFAULT_UPSELL_SETTINGS: OfferPageSettings = {
  headline: "Wait! Your order isn't complete...",
  subheadline: "Add this exclusive offer to your purchase",
  buttonText: "Yes, Upgrade My Order",
  bulletPoints: ["Exclusive bonus content", "Priority support", "Lifetime updates"],
  showSocialProof: true,
  reviewText: "This was exactly what I needed! Highly recommend.",
  reviewAuthor: "@HappyCustomer",
  reviewStars: 5,
  showDiscountPrice: false,
  discountPrice: 0,
  productDescription: "",
};

const DEFAULT_DOWNSELL_SETTINGS: OfferPageSettings = {
  headline: "Before you go...",
  subheadline: "Here's a special offer just for you",
  buttonText: "Yes, I Want This Deal",
  bulletPoints: ["Quick start guide included", "Email support for 30 days", "Instant digital delivery"],
  showSocialProof: true,
  reviewText: "Great value for the price! Exactly what I needed to get started.",
  reviewAuthor: "@NewCustomer",
  reviewStars: 5,
  showDiscountPrice: false,
  discountPrice: 0,
  productDescription: "",
};

const DEFAULT_OFFER_SETTINGS: FlowOfferSettings = {
  upsell: DEFAULT_UPSELL_SETTINGS,
  downsell: DEFAULT_DOWNSELL_SETTINGS,
};

const DEFAULT_FLOW_CONFIG: FlowConfig = {
  isActive: false,
  triggerProductId: null,
  upsellProductId: null,
  downsellProductId: null,
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  title: "🎁 Wait! Your order isn't complete...",
  content: "You unlocked an exclusive offer! Tap to claim it now.",
  enabled: true,
};

// Default single upsell flow
const DEFAULT_UPSELL_FLOW: UpsellFlow = {
  isActive: false,
  triggerProductId: null,
  upsellProductId: null,
  downsellProductId: null,
  notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS },
  offerSettings: { ...DEFAULT_OFFER_SETTINGS },
};

// Default flows structure (3 flows)
const DEFAULT_FLOWS: UserFlows = {
  flow1: { ...DEFAULT_UPSELL_FLOW },
  flow2: { ...DEFAULT_UPSELL_FLOW },
  flow3: { ...DEFAULT_UPSELL_FLOW },
};

/**
 * Create a fresh UpsellFlow with default values
 */
export function createDefaultFlow(): UpsellFlow {
  return {
    isActive: false,
    triggerProductId: null,
    upsellProductId: null,
    downsellProductId: null,
    notificationSettings: {
      title: "🎁 Wait! Your order isn't complete...",
      content: "You unlocked an exclusive offer! Tap to claim it now.",
      enabled: true,
    },
    offerSettings: {
      upsell: { ...DEFAULT_UPSELL_SETTINGS },
      downsell: { ...DEFAULT_DOWNSELL_SETTINGS },
    },
  };
}

/**
 * Migrate legacy user data to new flows structure
 * Copies existing flowConfig, notificationSettings, and offerSettings to flow1
 */
export function migrateUserToFlows(user: User): UserFlows {
  // If user already has flows, return them
  if (user.flows) {
    return user.flows;
  }

  // Create default flows
  const flows: UserFlows = {
    flow1: createDefaultFlow(),
    flow2: createDefaultFlow(),
    flow3: createDefaultFlow(),
  };

  // Migrate legacy data to flow1
  if (user.flowConfig) {
    flows.flow1.isActive = user.flowConfig.isActive;
    flows.flow1.triggerProductId = user.flowConfig.triggerProductId;
    flows.flow1.upsellProductId = user.flowConfig.upsellProductId;
    flows.flow1.downsellProductId = user.flowConfig.downsellProductId;
  }

  if (user.notificationSettings) {
    flows.flow1.notificationSettings = { ...user.notificationSettings };
  }

  if (user.offerSettings) {
    flows.flow1.offerSettings = {
      upsell: { ...user.offerSettings.upsell },
      downsell: { ...user.offerSettings.downsell },
    };
  }

  return flows;
}

/**
 * Get user's flows, migrating from legacy format if needed
 * This is the main function to use when accessing flows
 */
export async function getUserFlows(userId: string): Promise<UserFlows | null> {
  const user = await getUser(userId);
  if (!user) return null;

  return migrateUserToFlows(user);
}

/**
 * Get a specific flow by ID
 */
export async function getFlow(userId: string, flowId: FlowId): Promise<UpsellFlow | null> {
  const flows = await getUserFlows(userId);
  if (!flows) return null;

  return flows[flowId];
}

/**
 * Update a specific flow's config (trigger, upsell, downsell products, isActive)
 */
export async function updateFlow(
  userId: string,
  flowId: FlowId,
  updates: Partial<Omit<UpsellFlow, "notificationSettings" | "offerSettings">>
): Promise<void> {
  const user = await getUser(userId);
  if (!user) throw new Error("User not found");

  // Get current flows (with migration)
  const currentFlows = migrateUserToFlows(user);

  // Filter out undefined values from updates to avoid overwriting with undefined
  const filteredUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      filteredUpdates[key] = value;
    }
  }

  // Update the specific flow
  const updatedFlow = {
    ...currentFlows[flowId],
    ...filteredUpdates,
  };

  const updatedFlows = {
    ...currentFlows,
    [flowId]: updatedFlow,
  };

  // Save to database
  await db.collection("users").doc(userId).update({
    flows: updatedFlows,
    // Also update legacy flowConfig for backwards compatibility (flow1 only)
    ...(flowId === "flow1" ? {
      flowConfig: {
        isActive: updatedFlow.isActive,
        triggerProductId: updatedFlow.triggerProductId,
        upsellProductId: updatedFlow.upsellProductId,
        downsellProductId: updatedFlow.downsellProductId,
      },
    } : {}),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Update a flow's notification settings
 */
export async function updateFlowNotificationSettings(
  userId: string,
  flowId: FlowId,
  settings: Partial<NotificationSettings>
): Promise<void> {
  const user = await getUser(userId);
  if (!user) throw new Error("User not found");

  const currentFlows = migrateUserToFlows(user);
  const currentSettings = currentFlows[flowId].notificationSettings;

  const updatedFlows = {
    ...currentFlows,
    [flowId]: {
      ...currentFlows[flowId],
      notificationSettings: {
        ...currentSettings,
        ...settings,
      },
    },
  };

  await db.collection("users").doc(userId).update({
    flows: updatedFlows,
    // Also update legacy notificationSettings for backwards compatibility (flow1 only)
    ...(flowId === "flow1" ? {
      notificationSettings: {
        ...currentSettings,
        ...settings,
      },
    } : {}),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Update a flow's offer settings (upsell or downsell page content)
 */
export async function updateFlowOfferSettings(
  userId: string,
  flowId: FlowId,
  type: "upsell" | "downsell",
  settings: Partial<OfferPageSettings>
): Promise<void> {
  const user = await getUser(userId);
  if (!user) throw new Error("User not found");

  const currentFlows = migrateUserToFlows(user);
  const currentOfferSettings = currentFlows[flowId].offerSettings;

  const updatedOfferSettings = {
    ...currentOfferSettings,
    [type]: {
      ...currentOfferSettings[type],
      ...settings,
    },
  };

  const updatedFlows = {
    ...currentFlows,
    [flowId]: {
      ...currentFlows[flowId],
      offerSettings: updatedOfferSettings,
    },
  };

  await db.collection("users").doc(userId).update({
    flows: updatedFlows,
    // Also update legacy offerSettings for backwards compatibility (flow1 only)
    ...(flowId === "flow1" ? {
      offerSettings: updatedOfferSettings,
    } : {}),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Find a matching flow for a given trigger product ID
 * Returns the first active flow whose trigger matches the product
 */
export function findMatchingFlow(
  flows: UserFlows,
  triggerProductId: string
): { flowId: FlowId; flow: UpsellFlow } | null {
  const flowIds: FlowId[] = ["flow1", "flow2", "flow3"];

  for (const flowId of flowIds) {
    const flow = flows[flowId];
    if (flow.isActive && flow.triggerProductId === triggerProductId) {
      return { flowId, flow };
    }
  }

  return null;
}

/**
 * Check if any flow can run for a user
 * Returns the matching flow if found
 */
export async function canRunAnyUpsellFlow(
  userId: string,
  triggerProductId: string
): Promise<{
  allowed: boolean;
  reason?: string;
  flowId?: FlowId;
  flow?: UpsellFlow;
}> {
  const user = await getUser(userId);
  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  // Check if locked out
  const isLockedOut = await checkAndEnforceLockout(userId);
  if (isLockedOut) {
    return { allowed: false, reason: "Account locked due to unpaid billing" };
  }

  // Check if payment method is connected
  if (!user.paymentMethodConnected) {
    return { allowed: false, reason: "Payment method not connected" };
  }

  // Get flows (with migration)
  const flows = migrateUserToFlows(user);

  // Find matching flow
  const match = findMatchingFlow(flows, triggerProductId);
  if (!match) {
    return { allowed: false, reason: "No matching active flow for this product" };
  }

  // Check if flow is properly configured
  if (!match.flow.upsellProductId) {
    return { allowed: false, reason: "Upsell flow not configured" };
  }

  return {
    allowed: true,
    flowId: match.flowId,
    flow: match.flow,
  };
}

export async function createUser(data: {
  whopCompanyId: string;
  whopMemberId?: string; // Optional - will use whopUserId as fallback
  whopUserId: string;
  email: string | null;
}): Promise<User> {
  const now = Timestamp.now();
  const userData = {
    whopCompanyId: data.whopCompanyId,
    whopMemberId: data.whopMemberId || data.whopUserId, // Use userId as fallback
    whopUserId: data.whopUserId,
    email: data.email,
    paymentMethodId: null,
    paymentMethodConnected: false,
    billingStatus: "active" as const,
    billingCycleStart: null,
    nextBillingDate: null,
    paymentFailedAt: null,
    gracePeriodEndsAt: null,
    lastFailedInvoiceId: null,
    totalRevenueGeneratedCents: 0,
    analytics: {
      totalViews: 0,
      totalConversions: 0,
      weeklyViews: 0,
      weeklyConversions: 0,
      weeklyRevenueGeneratedCents: 0,
      lastResetAt: now,
    },
    // New flows structure
    flows: {
      flow1: createDefaultFlow(),
      flow2: createDefaultFlow(),
      flow3: createDefaultFlow(),
    },
    // Legacy fields for backwards compatibility
    flowConfig: DEFAULT_FLOW_CONFIG,
    offerSettings: DEFAULT_OFFER_SETTINGS,
    notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
    hiddenProductIds: [],
    syncedProductIds: [],
    productImages: {},
    productOverrides: {},
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection("users").add(userData);
  return { id: docRef.id, ...userData } as User;
}

export async function updateUserPaymentMethod(
  userId: string,
  paymentMethodId: string,
  whopMemberId?: string
): Promise<void> {
  const now = Timestamp.now();
  const sevenDaysFromNow = Timestamp.fromDate(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );

  const updateData: Record<string, unknown> = {
    paymentMethodId,
    paymentMethodConnected: true,
    billingCycleStart: now,
    nextBillingDate: sevenDaysFromNow,
    updatedAt: now,
  };

  // Also save member ID if provided (required for billing charges)
  if (whopMemberId) {
    updateData.whopMemberId = whopMemberId;
  }

  await db.collection("users").doc(userId).update(updateData);
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
  status: "active" | "grace_period" | "unpaid_lockout"
): Promise<void> {
  const updateData: Record<string, unknown> = {
    billingStatus: status,
    updatedAt: Timestamp.now(),
  };

  // Clear grace period fields when restored to active
  if (status === "active") {
    updateData.paymentFailedAt = null;
    updateData.gracePeriodEndsAt = null;
    updateData.lastFailedInvoiceId = null;
  }

  await db.collection("users").doc(userId).update(updateData);
}

// Grace period is 24 hours
const GRACE_PERIOD_HOURS = 24;

export async function startGracePeriod(
  userId: string,
  failedInvoiceId: string
): Promise<void> {
  const now = Timestamp.now();
  const gracePeriodEnds = Timestamp.fromDate(
    new Date(Date.now() + GRACE_PERIOD_HOURS * 60 * 60 * 1000)
  );

  await db.collection("users").doc(userId).update({
    billingStatus: "grace_period",
    paymentFailedAt: now,
    gracePeriodEndsAt: gracePeriodEnds,
    lastFailedInvoiceId: failedInvoiceId,
    updatedAt: now,
  });
}

export async function checkAndEnforceLockout(userId: string): Promise<boolean> {
  const user = await getUser(userId);
  if (!user) return false;

  // If already locked out, return true
  if (user.billingStatus === "unpaid_lockout") {
    return true;
  }

  // If in grace period, check if it's expired
  if (user.billingStatus === "grace_period" && user.gracePeriodEndsAt) {
    const now = new Date();
    const gracePeriodEnd = user.gracePeriodEndsAt.toDate();

    if (now > gracePeriodEnd) {
      // Grace period expired - enforce lockout
      await updateBillingStatus(userId, "unpaid_lockout");
      return true;
    }
  }

  return false;
}

/**
 * Check if user can run upsell flows
 * Returns false if:
 * - billingStatus is unpaid_lockout
 * - flowConfig.isActive is false
 * - Grace period has expired (will also trigger lockout)
 */
export async function canRunUpsellFlow(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const user = await getUser(userId);
  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  // Check if locked out (also enforces lockout if grace period expired)
  const isLockedOut = await checkAndEnforceLockout(userId);
  if (isLockedOut) {
    return { allowed: false, reason: "Account locked due to unpaid billing" };
  }

  // Check if flow is enabled
  if (!user.flowConfig.isActive) {
    return { allowed: false, reason: "Upsell flow is disabled" };
  }

  // Check if flow is properly configured
  if (!user.flowConfig.triggerProductId || !user.flowConfig.upsellProductId) {
    return { allowed: false, reason: "Upsell flow not configured" };
  }

  // Check if payment method is connected (required to go live)
  if (!user.paymentMethodConnected) {
    return { allowed: false, reason: "Payment method not connected" };
  }

  return { allowed: true };
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

export async function updateOfferSettings(
  userId: string,
  type: "upsell" | "downsell",
  settings: Partial<OfferPageSettings>
): Promise<void> {
  const user = await getUser(userId);
  if (!user) throw new Error("User not found");

  // Handle legacy users who don't have offerSettings yet
  const currentSettings = user.offerSettings || DEFAULT_OFFER_SETTINGS;

  const updatedSettings = {
    ...currentSettings,
    [type]: {
      ...currentSettings[type],
      ...settings,
    },
  };

  await db.collection("users").doc(userId).update({
    offerSettings: updatedSettings,
    updatedAt: Timestamp.now(),
  });
}

export async function getOfferSettings(userId: string): Promise<FlowOfferSettings> {
  const user = await getUser(userId);
  if (!user) throw new Error("User not found");

  // Handle legacy users
  return user.offerSettings || DEFAULT_OFFER_SETTINGS;
}

export async function updateNotificationSettings(
  userId: string,
  settings: Partial<NotificationSettings>
): Promise<void> {
  const user = await getUser(userId);
  if (!user) throw new Error("User not found");

  const currentSettings = user.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS;

  // Filter out undefined values to avoid Firestore errors
  const filteredSettings: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined) {
      filteredSettings[key] = value;
    }
  }

  const updatedSettings = {
    ...currentSettings,
    ...filteredSettings,
  };

  await db.collection("users").doc(userId).update({
    notificationSettings: updatedSettings,
    updatedAt: Timestamp.now(),
  });
}

export async function getNotificationSettings(userId: string): Promise<NotificationSettings> {
  const user = await getUser(userId);
  if (!user) throw new Error("User not found");

  return user.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS;
}

export async function updateHiddenProducts(
  userId: string,
  hiddenProductIds: string[]
): Promise<void> {
  await db.collection("users").doc(userId).update({
    hiddenProductIds,
    updatedAt: Timestamp.now(),
  });
}

export async function getHiddenProducts(userId: string): Promise<string[]> {
  const user = await getUser(userId);
  if (!user) return [];
  return user.hiddenProductIds || [];
}

// ============================================
// SYNCED PRODUCTS FUNCTIONS
// Synced products = eligible for 5% fee (upsells, downsells, storefront)
// Does NOT include trigger products
// ============================================

/**
 * Add product IDs to the synced products list
 * Used when admin selects products as upsells/downsells or shows them in storefront
 */
export async function addSyncedProducts(
  userId: string,
  productIds: string[]
): Promise<void> {
  if (productIds.length === 0) return;

  await db.collection("users").doc(userId).update({
    syncedProductIds: FieldValue.arrayUnion(...productIds),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Remove product IDs from the synced products list
 * Used when admin removes products from upsells/downsells or hides them from storefront
 */
export async function removeSyncedProducts(
  userId: string,
  productIds: string[]
): Promise<void> {
  if (productIds.length === 0) return;

  await db.collection("users").doc(userId).update({
    syncedProductIds: FieldValue.arrayRemove(...productIds),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Check if a product is synced (eligible for 5% fee)
 * Simple array lookup - much faster than querying flow configs
 */
export async function isProductSynced(
  userId: string,
  productId: string
): Promise<boolean> {
  const user = await getUser(userId);
  if (!user) return false;
  return user.syncedProductIds?.includes(productId) || false;
}

/**
 * Check if a product is synced by company ID
 * Used by webhook handler
 */
export async function isProductSyncedByCompany(
  companyId: string,
  productId: string
): Promise<boolean> {
  const user = await getUserByWhopCompanyId(companyId);
  if (!user) return false;
  return user.syncedProductIds?.includes(productId) || false;
}

/**
 * Get all synced product IDs for a user
 */
export async function getSyncedProducts(userId: string): Promise<string[]> {
  const user = await getUser(userId);
  if (!user) return [];
  return user.syncedProductIds || [];
}

export async function updateProductImage(
  userId: string,
  productId: string,
  imageUrl: string
): Promise<void> {
  const user = await getUser(userId);
  if (!user) throw new Error("User not found");

  const productImages = user.productImages || {};
  productImages[productId] = imageUrl;

  await db.collection("users").doc(userId).update({
    productImages,
    updatedAt: Timestamp.now(),
  });
}

export async function getProductImages(userId: string): Promise<Record<string, string>> {
  const user = await getUser(userId);
  if (!user) return {};
  return user.productImages || {};
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
  // Check if this product is configured as an upsell or downsell in any user's flow
  // This is critical for tracking conversions and revenue
  const flowIds = ["flow1", "flow2", "flow3"] as const;

  for (const flowId of flowIds) {
    // Check if product is an upsellProductId in any user's flow
    const upsellSnapshot = await db
      .collection("users")
      .where(`flows.${flowId}.upsellProductId`, "==", whopProductId)
      .limit(1)
      .get();

    if (!upsellSnapshot.empty) return true;

    // Check if product is a downsellProductId in any user's flow
    const downsellSnapshot = await db
      .collection("users")
      .where(`flows.${flowId}.downsellProductId`, "==", whopProductId)
      .limit(1)
      .get();

    if (!downsellSnapshot.empty) return true;
  }

  // Also check legacy flowConfig for backwards compatibility
  const legacyUpsellSnapshot = await db
    .collection("users")
    .where("flowConfig.upsellProductId", "==", whopProductId)
    .limit(1)
    .get();

  if (!legacyUpsellSnapshot.empty) return true;

  const legacyDownsellSnapshot = await db
    .collection("users")
    .where("flowConfig.downsellProductId", "==", whopProductId)
    .limit(1)
    .get();

  return !legacyDownsellSnapshot.empty;
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

// ============================================
// ANALYTICS FUNCTIONS
// ============================================

/**
 * Record an upsell page view (when the offer modal is shown)
 */
export async function recordUpsellView(userId: string): Promise<void> {
  await db.collection("users").doc(userId).update({
    "analytics.totalViews": FieldValue.increment(1),
    "analytics.weeklyViews": FieldValue.increment(1),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Record an upsell conversion (when user purchases the upsell/downsell)
 * Also updates weekly revenue
 */
export async function recordUpsellConversion(
  userId: string,
  revenueCents: number
): Promise<void> {
  await db.collection("users").doc(userId).update({
    "analytics.totalConversions": FieldValue.increment(1),
    "analytics.weeklyConversions": FieldValue.increment(1),
    "analytics.weeklyRevenueGeneratedCents": FieldValue.increment(revenueCents),
    totalRevenueGeneratedCents: FieldValue.increment(revenueCents),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Get analytics data for a user with calculated conversion rate
 */
export async function getAnalytics(userId: string): Promise<{
  totalViews: number;
  totalConversions: number;
  conversionRate: number;
  weeklyViews: number;
  weeklyConversions: number;
  weeklyRevenue: number;
  totalRevenue: number;
} | null> {
  const user = await getUser(userId);
  if (!user) return null;

  // Handle users without analytics data (pre-update)
  const analytics = user.analytics || {
    totalViews: 0,
    totalConversions: 0,
    weeklyViews: 0,
    weeklyConversions: 0,
    weeklyRevenueGeneratedCents: 0,
    lastResetAt: Timestamp.now(),
  };

  const conversionRate = analytics.totalViews > 0
    ? Math.round((analytics.totalConversions / analytics.totalViews) * 100)
    : 0;

  return {
    totalViews: analytics.totalViews,
    totalConversions: analytics.totalConversions,
    conversionRate,
    weeklyViews: analytics.weeklyViews,
    weeklyConversions: analytics.weeklyConversions,
    weeklyRevenue: analytics.weeklyRevenueGeneratedCents / 100,
    totalRevenue: user.totalRevenueGeneratedCents / 100,
  };
}

/**
 * Reset weekly analytics (called by cron job every week)
 */
export async function resetWeeklyAnalytics(userId: string): Promise<void> {
  await db.collection("users").doc(userId).update({
    "analytics.weeklyViews": 0,
    "analytics.weeklyConversions": 0,
    "analytics.weeklyRevenueGeneratedCents": 0,
    "analytics.lastResetAt": Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Check if weekly analytics need to be reset (if last reset was more than 7 days ago)
 */
export async function checkAndResetWeeklyAnalyticsIfNeeded(userId: string): Promise<boolean> {
  const user = await getUser(userId);
  if (!user || !user.analytics?.lastResetAt) return false;

  const lastReset = user.analytics.lastResetAt.toDate();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  if (lastReset < sevenDaysAgo) {
    await resetWeeklyAnalytics(userId);
    return true;
  }

  return false;
}

// ============================================
// OFFER SESSION FUNCTIONS
// ============================================

/**
 * Offer session data stored in Firestore
 * Used for short offer URLs instead of long tokens
 */
export interface OfferSession {
  id: string;
  ownerId: string; // Stacker user who owns this flow
  flowId: FlowId;
  buyerUserId: string;
  buyerEmail: string | null;
  buyerMemberId: string;
  companyId: string;
  triggerProductId: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

/**
 * Generate a short random ID for offer sessions
 * Format: offer_XXXXXXXXXX (10 random alphanumeric chars)
 */
function generateShortId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "offer_";
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create an offer session with a short ID
 * Returns the short ID to use in the notification rest_path
 * Sessions expire after 1 hour for security
 */
export async function createOfferSession(data: {
  ownerId: string;
  flowId: FlowId;
  buyerUserId: string;
  buyerEmail: string | null;
  buyerMemberId: string;
  companyId: string;
  triggerProductId: string;
}): Promise<string> {
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hour expiry
  );

  const offerId = generateShortId();

  const sessionData = {
    ownerId: data.ownerId,
    flowId: data.flowId,
    buyerUserId: data.buyerUserId,
    buyerEmail: data.buyerEmail,
    buyerMemberId: data.buyerMemberId,
    companyId: data.companyId,
    triggerProductId: data.triggerProductId,
    createdAt: now,
    expiresAt,
  };

  // Use the short ID as the document ID for easy lookup
  await db.collection("offerSessions").doc(offerId).set(sessionData);

  console.log("Created offer session:", offerId);
  return offerId;
}

/**
 * Get an offer session by its short ID
 * Returns null if not found or expired
 */
export async function getOfferSession(offerId: string): Promise<OfferSession | null> {
  const doc = await db.collection("offerSessions").doc(offerId).get();
  if (!doc.exists) {
    console.log("Offer session not found:", offerId);
    return null;
  }

  const data = doc.data() as Omit<OfferSession, "id">;

  // Check if expired
  const now = new Date();
  const expiresAt = data.expiresAt.toDate();
  if (now > expiresAt) {
    console.log("Offer session expired:", offerId);
    // Optionally delete expired session
    await db.collection("offerSessions").doc(offerId).delete();
    return null;
  }

  return { id: doc.id, ...data } as OfferSession;
}

// ============================================
// STACKER PAYMENT TRACKING
// ============================================
// Since Whop's payments.create API doesn't support metadata,
// we track pending Stacker payments in Firestore and look them up
// by payment ID in the webhook.

export interface StackerPayment {
  id: string;
  whopPaymentId: string;
  source: "upsell" | "downsell" | "storefront";
  ownerId: string;
  companyId: string;
  productId: string;
  buyerUserId: string;
  createdAt: Timestamp;
}

/**
 * Record a Stacker payment for tracking
 * Called after creating a one-click payment via Whop API
 */
export async function createStackerPayment(data: {
  whopPaymentId: string;
  source: "upsell" | "downsell" | "storefront";
  ownerId: string;
  companyId: string;
  productId: string;
  buyerUserId: string;
}): Promise<string> {
  const docRef = await db.collection("stackerPayments").add({
    whopPaymentId: data.whopPaymentId,
    source: data.source,
    ownerId: data.ownerId,
    companyId: data.companyId,
    productId: data.productId,
    buyerUserId: data.buyerUserId,
    createdAt: Timestamp.now(),
  });

  console.log("Stacker payment tracked:", docRef.id, "whopPaymentId:", data.whopPaymentId);
  return docRef.id;
}

/**
 * Look up a Stacker payment by Whop payment ID
 * Returns the payment record if found, null otherwise
 */
export async function getStackerPaymentByWhopId(whopPaymentId: string): Promise<StackerPayment | null> {
  const snapshot = await db
    .collection("stackerPayments")
    .where("whopPaymentId", "==", whopPaymentId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as StackerPayment;
}

/**
 * Delete a Stacker payment record after processing
 * Called after the webhook has recorded the transaction
 */
export async function deleteStackerPayment(id: string): Promise<void> {
  await db.collection("stackerPayments").doc(id).delete();
  console.log("Stacker payment record deleted:", id);
}

