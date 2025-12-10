import { Whop } from "@whop/sdk";

// Lazy initialization to avoid build-time errors
let _whopsdk: Whop | null = null;

export function getWhopSDK(): Whop {
  if (!_whopsdk) {
    _whopsdk = new Whop({
      apiKey: process.env.WHOP_API_KEY,
      appID: process.env.WHOP_APP_ID, // Required for token verification
      webhookKey: process.env.WHOP_WEBHOOK_SECRET
        ? btoa(process.env.WHOP_WEBHOOK_SECRET)
        : undefined,
    });
  }
  return _whopsdk;
}

// Getter for backward compatibility
export const whopsdk = {
  get webhooks() {
    return getWhopSDK().webhooks;
  },
  get payments() {
    return getWhopSDK().payments;
  },
  get paymentMethods() {
    return getWhopSDK().paymentMethods;
  },
  get checkoutConfigurations() {
    return getWhopSDK().checkoutConfigurations;
  },
  get products() {
    return getWhopSDK().products;
  },
  get plans() {
    return getWhopSDK().plans;
  },
  get memberships() {
    return getWhopSDK().memberships;
  },
  get companies() {
    return getWhopSDK().companies;
  },
  get users() {
    return getWhopSDK().users;
  },
  get authorizedUsers() {
    return getWhopSDK().authorizedUsers;
  },
  get notifications() {
    return getWhopSDK().notifications;
  },
  get experiences() {
    return getWhopSDK().experiences;
  },
  // Authentication method
  verifyUserToken: async (
    headersOrRequest: Headers | Request | string | null | undefined,
    options?: { dontThrow?: boolean }
  ) => {
    return getWhopSDK().verifyUserToken(headersOrRequest, options);
  },
};

// Stacker's billing company ID (where Stacker receives 5% fee payments from sellers)
// This must be DIFFERENT from any seller's company ID
// Set STACKER_BILLING_COMPANY_ID in env vars when you create Stacker's Whop company
export const STACKER_COMPANY_ID = process.env.STACKER_BILLING_COMPANY_ID || "biz_STACKER_NOT_SET";

// Stacker's App ID
export const STACKER_APP_ID = process.env.WHOP_APP_ID || "";

// Export for convenience
export { Whop };
