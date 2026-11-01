import { prisma } from "./prisma";
import type { PaymentProviderName } from "./payments-types";

export type PaymentSessionStatus = "pending" | "succeeded" | "failed";

export interface PaymentProvider {
  name: PaymentProviderName;
  createPaymentSession: (args: {
    amount: number; // cents
    currency: string;
    idempotencyKey: string;
    metadata: Record<string, string>;
  }) => Promise<{
    providerPaymentId: string;
    status: PaymentSessionStatus;
  }>;
}

/**
 * Deterministic fake payment provider for development and tests.
 * Simulates a payment gateway without any network calls.
 *
 * Every payment succeeds unless the idempotency key contains "fail".
 */
export class FakePaymentProvider implements PaymentProvider {
  name = "fake" as const;

  async createPaymentSession({
    amount,
    idempotencyKey,
  }: {
    amount: number;
    currency: string;
    idempotencyKey: string;
    metadata: Record<string, string>;
  }): Promise<{
    providerPaymentId: string;
    status: PaymentSessionStatus;
  }> {
    const shouldFail = idempotencyKey.includes("fail");
    return {
      providerPaymentId: `fake_${crypto.randomUUID()}`,
      status: (shouldFail ? "failed" : "succeeded") as PaymentSessionStatus,
    };
  }
}

/**
 * Stripe test-mode adapter — stubbed in M1/M2. M4 implements the real adapter;
 * tests never call Stripe (mocked at the network boundary).
 */
export class StripePaymentProvider implements PaymentProvider {
  name = "stripe" as const;

  async createPaymentSession(): Promise<{
    providerPaymentId: string;
    status: PaymentSessionStatus;
  }> {
    throw new Error("Stripe adapter not implemented yet; use the fake provider.");
  }
}

export const paymentProviders: Record<PaymentProviderName, PaymentProvider> = {
  fake: new FakePaymentProvider(),
  stripe: new StripePaymentProvider(),
};

/**
 * Create a PaymentAttempt for a checkout. Idempotency key is stored so that
 * repeated checkout submissions with the same key return the same attempt.
 */
export async function createPaymentAttempt(args: {
  orderId: string;
  provider: PaymentProviderName;
  idempotencyKey: string;
  amount: number; // cents
  currency: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  providerId?: string;
}) {
  const { orderId, provider, idempotencyKey, amount, currency, status, providerId } = args;

  // Idempotency: return existing attempt if one exists for this key.
  const existing = await prisma.paymentAttempt.findUnique({
    where: { idempotencyKey },
  });
  if (existing) {
    return existing;
  }

  return prisma.paymentAttempt.create({
    data: {
      orderId,
      provider,
      providerId,
      idempotencyKey,
      status,
      amount,
      currency,
    },
  });
}
