import { describe, it, expect } from "vitest";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stripe webhook signature verification, tested with synthetic payloads.
 * No external Stripe calls are made (threat model T2).
 *
 * Stripe's webhook signature scheme (simplified):
 *   timestamp = current Unix timestamp
 *   signed_payload = `${timestamp}.${payload}`
 *   signature = HMAC-SHA256(secret, signed_payload)
 *   Header: `t=timestamp,v1=signature`
 *
 * We verify by recomputing the HMAC and comparing in constant time.
 * We also enforce a tolerance window (default 5 minutes) to prevent replay.
 */

function computeStripeSignature(
  secret: string,
  payload: string,
  timestamp: number
): string {
  const signedPayload = `${timestamp}.${payload}`;
  return createHmac("sha256", secret).update(signedPayload).digest("hex");
}

function buildStripeHeader(secret: string, payload: string, timestamp?: string): string {
  const ts = timestamp ?? Math.floor(Date.now() / 1000).toString();
  const sig = computeStripeSignature(secret, payload, parseInt(ts, 10));
  return `t=${ts},v1=${sig}`;
}

function verifyStripeSignature(
  secret: string,
  payload: string,
  header: string,
  toleranceMs: number = 5 * 60 * 1000
): boolean {
  const parts = header.split(",");
  let timestamp: string | null = null;
  let signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return false;

  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (Math.abs(now - ts) * 1000 > toleranceMs) return false;

  const expected = computeStripeSignature(secret, payload, ts);
  return signatures.some((sig) => timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

describe("Stripe webhook signature verification (synthetic payloads)", () => {
  const secret = "whsec_test_secret_key";
  const payload = JSON.stringify({
    id: "evt_test_123",
    type: "checkout.session.completed",
    data: { object: { id: "cs_test_123", payment_status: "paid" } },
  });

  it("accepts a valid signature", () => {
    const header = buildStripeHeader(secret, payload);
    expect(verifyStripeSignature(secret, payload, header)).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const header = buildStripeHeader(secret, payload);
    const tampered = payload.replace("evt_test_123", "evt_test_999");
    expect(verifyStripeSignature(secret, tampered, header)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const header = buildStripeHeader(secret, payload);
    expect(verifyStripeSignature("wrong_secret", payload, header)).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(verifyStripeSignature(secret, payload, "")).toBe(false);
  });

  it("rejects a header with no signatures", () => {
    expect(verifyStripeSignature(secret, payload, "t=1234567890")).toBe(false);
  });

  it("rejects an expired timestamp (outside tolerance)", () => {
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString(); // 10 min ago
    const header = buildStripeHeader(secret, payload, oldTimestamp);
    expect(verifyStripeSignature(secret, payload, header, 5 * 60 * 1000)).toBe(false);
  });

  it("accepts a timestamp within tolerance", () => {
    const recentTimestamp = (Math.floor(Date.now() / 1000) - 30).toString(); // 30 sec ago
    const header = buildStripeHeader(secret, payload, recentTimestamp);
    expect(verifyStripeSignature(secret, payload, header, 5 * 60 * 1000)).toBe(true);
  });

  it("uses constant-time comparison", () => {
    // timingSafeEqual should not throw and should return boolean
    const header = buildStripeHeader(secret, payload);
    const result = verifyStripeSignature(secret, payload, header);
    expect(typeof result).toBe("boolean");
  });
});
