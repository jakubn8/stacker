import crypto from "crypto";
import type { FlowId } from "./db";

const SECRET = process.env.CRON_SECRET || "default-secret-change-in-production";
const TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export interface OfferTokenPayload {
  // Customer info (from Whop purchase)
  buyerUserId: string;
  buyerEmail: string | null;
  buyerMemberId: string; // Required for one-click payments
  // Context
  companyId: string;
  triggerProductId: string;
  // Flow identifier (which upsell flow to use)
  flowId: FlowId;
  // Metadata
  createdAt: number;
  expiresAt: number;
}

/**
 * Generate a signed token for the offer page
 * This is created when we receive a purchase webhook
 */
export function generateOfferToken(data: {
  buyerUserId: string;
  buyerEmail: string | null;
  buyerMemberId: string;
  companyId: string;
  triggerProductId: string;
  flowId: FlowId;
}): string {
  const now = Date.now();
  const payload: OfferTokenPayload = {
    buyerUserId: data.buyerUserId,
    buyerEmail: data.buyerEmail,
    buyerMemberId: data.buyerMemberId,
    companyId: data.companyId,
    triggerProductId: data.triggerProductId,
    flowId: data.flowId,
    createdAt: now,
    expiresAt: now + TOKEN_EXPIRY_MS,
  };

  // Encode payload
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");

  // Create signature
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(payloadStr)
    .digest("base64url");

  // Return token as payload.signature
  return `${payloadStr}.${signature}`;
}

/**
 * Verify and decode an offer token
 * Returns null if invalid or expired
 */
export function verifyOfferToken(token: string): OfferTokenPayload | null {
  try {
    const [payloadStr, signature] = token.split(".");

    if (!payloadStr || !signature) {
      return null;
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", SECRET)
      .update(payloadStr)
      .digest("base64url");

    if (signature !== expectedSignature) {
      console.error("Invalid token signature");
      return null;
    }

    // Decode payload
    const payload: OfferTokenPayload = JSON.parse(
      Buffer.from(payloadStr, "base64url").toString("utf-8")
    );

    // Check expiry
    if (Date.now() > payload.expiresAt) {
      console.error("Token expired");
      return null;
    }

    return payload;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}
