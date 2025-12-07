This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


# Project Name: Stacker (Whop Native B2B App)

## 1. Project Overview
**Stacker** is a B2B application for the Whop.com marketplace. It helps Community Owners increase revenue by offering intelligent post-purchase upsells and a persistent storefront.

**The Core User Flow:**
1.  **Trigger:** A user buys a "Main Membership" (Product A).
2.  **Intercept:** Instead of going to the community chat, Whop redirects them to our app (`/intercept`).
3.  **The Offer:** We check if they already own the Upsell Product. If NOT, we show a "One-Time Offer" modal.
4.  **One-Click Action:** If they accept, we charge their saved card instantly (Off-Session Payment).
5.  **Storefront:** A persistent "Shop" tab (`/experience`) allows members to browse and buy these products later.

---

## 2. Tech Stack & Architecture
* **Framework:** Next.js 14 (App Router).
* **Database:** Firebase Firestore (NoSQL).
* **UI Library:** `@whop/frosted-ui` (Already installed & used in frontend).
* **SDK:** `@whop/sdk` (Already installed).
* **Environment:** Vercel (Production) / Localhost (Dev).

---

## 3. Database Schema (Firestore)
We use a single collection: `companies`.
**Document ID:** The Whop Company ID (e.g., `biz_12345`).

**Full Schema Structure:**
```json
{
  "company_id": "biz_12345",
  "installed_at": "timestamp",
  "total_revenue_generated_cents": 125000, // $1,250.00
  "config": {
    "is_active": true,
    // The Flow Logic
    "trigger_product_id": "prod_main_123",
    "upsell_product_id": "prod_upsell_456",
    "downsell_product_id": "prod_downsell_789", // Optional

    // The Post-Purchase Page Customization (Live Editor)
    "offer_page_settings": {
       "headline": "Wait! Your order isn't complete...",
       "subheadline": "Add this exclusive offer to your purchase.",
       "button_text": "Yes, Upgrade My Order",
       "bullet_points": [
          "Lifetime access to updates",
          "Exclusive strategy templates",
          "Priority support"
       ],
       "show_social_proof": true,
       "review_text": "This saved my trading account!",
       "review_author": "@CryptoKing",
       "review_stars": 5
    }
  },

  // The Storefront "Metadata Layer"
  // We do not store price/title. We store OVERRIDES.
  "product_overrides": {
     "prod_upsell_456": {
        "custom_display_name": "VIP Protocol",
        "custom_description": "The elite tier for serious traders.",
        "custom_image_url": "https://...",
        "show_discount_badge": true,
        "original_price_cents": 9900 // Used to show "~~$99.00~~ $19.00"
     }
  },

  // Which products appear in the persistent "Shop" tab
  "storefront_product_ids": ["prod_upsell_456", "prod_downsell_789"]



# Project Name: Stacker (Whop Native B2B App)

## 1. Project Overview
**Stacker** is a B2B application for the Whop.com marketplace. It helps Community Owners increase revenue by offering intelligent post-purchase upsells and a persistent storefront.

**The Core User Flow:**
1.  **Trigger:** A user buys a "Main Membership" (Product A).
2.  **Intercept:** Instead of going to the community chat, Whop redirects them to our app (`/intercept`).
3.  **The Offer:** We check if they already own the Upsell Product. If NOT, we show a "One-Time Offer" modal.
4.  **One-Click Action:** If they accept, we charge their saved card instantly (Off-Session Payment).
5.  **Storefront:** A persistent "Shop" tab (`/experience`) allows members to browse and buy these products later.

---

## 2. Tech Stack & Architecture
* **Framework:** Next.js 14 (App Router).
* **Database:** Firebase Firestore (NoSQL).
* **UI Library:** `@whop/frosted-ui` (Already installed & used in frontend).
* **SDK:** `@whop/sdk` (Already installed).
* **Environment:** Vercel (Production) / Localhost (Dev).

---

## 3. Database Schema (Firestore)
We use a single collection: `companies`.
**Document ID:** The Whop Company ID (e.g., `biz_12345`).

**Full Schema Structure:**
```json
{
  "company_id": "biz_12345",
  "installed_at": "timestamp",
  "total_revenue_generated_cents": 125000, // $1,250.00
  "config": {
    "is_active": true,
    // The Flow Logic
    "trigger_product_id": "prod_main_123",
    "upsell_product_id": "prod_upsell_456",
    "downsell_product_id": "prod_downsell_789", // Optional

    // The Post-Purchase Page Customization (Live Editor)
    "offer_page_settings": {
       "headline": "Wait! Your order isn't complete...",
       "subheadline": "Add this exclusive offer to your purchase.",
       "button_text": "Yes, Upgrade My Order",
       "bullet_points": [
          "Lifetime access to updates",
          "Exclusive strategy templates",
          "Priority support"
       ],
       "show_social_proof": true,
       "review_text": "This saved my trading account!",
       "review_author": "@CryptoKing",
       "review_stars": 5
    }
  },

  // The Storefront "Metadata Layer"
  // We do not store price/title. We store OVERRIDES.
  "product_overrides": {
     "prod_upsell_456": {
        "custom_display_name": "VIP Protocol",
        "custom_description": "The elite tier for serious traders.",
        "custom_image_url": "https://...",
        "show_discount_badge": true,
        "original_price_cents": 9900 // Used to show "~~$99.00~~ $19.00"
     }
  },

  // Which products appear in the persistent "Shop" tab
  "storefront_product_ids": ["prod_upsell_456", "prod_downsell_789"]
}
4. Key Implementation Details
A. Authentication
Every request must be verified using the x-whop-user-token header.

Helper: Create lib/whop.ts to initialize the SDK with the user's token.

Validation: Use WhopAPI.me() or validateToken to ensure the user actually belongs to the company they are trying to access.


C. The "Smart" Inventory Check
Before showing an upsell, we MUST check if the user owns it.

Endpoint: whop.memberships.list({ user_id, product_id }).

Rule: If memberships.length > 0 AND status === 'active', do not show the offer. Redirect straight to the community.

5. Step-by-Step Implementation Plan (For AI)
Phase 1: The Plumbing (Backend Setup)

Initialize Firebase Admin in lib/firebase.ts.

Create lib/db.ts with helper functions:

getCompanyConfig(companyId)

saveCompanyConfig(companyId, data)

saveProductOverride(companyId, productId, data)

Phase 2: Wiring the Dashboard

Connect the "Save Changes" button in /dashboard/[id]/editor to a Server Action updateOfferSettings.

Connect the "Upsell Flow" dropdowns to a Server Action updateFlowConfig.

Connect the "Storefront Editor" modal to updateProductOverride.

Phase 3: The Intercept Logic

In /intercept/page.tsx, fetch the config.

Run the Inventory Check.

If valid, render the <OfferCard> with data from offer_page_settings.

Wire the "Yes" button to a Server Action handleOneClickBuy.

6. Reference Links
Whop Webhooks: https://docs.whop.com/developer/guides/webhooks

Whop Payments API: https://www.google.com/search?q=https://docs.whop.com/whop-apps/b2b-apps%23accept-payments-in-your-app