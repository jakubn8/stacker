import { Whop } from "@whop/sdk";

// Lazy initialization to avoid build-time errors
let _whopsdk: Whop | null = null;

export function getWhopSDK(): Whop {
  if (!_whopsdk) {
    _whopsdk = new Whop({
      apiKey: process.env.WHOP_API_KEY,
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
};

// Stacker's company ID (where we receive billing payments)
export const STACKER_COMPANY_ID = process.env.WHOP_COMPANY_ID || "";

// Export for convenience
export { Whop };
