import { prisma } from "./prisma";

export type PaymentProviderName = "fake" | "stripe";

type PaymentSessionStatus = "pending" | "succeeded" | "failed";

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
 * In M1 every payment "succeeds" deterministically. M2 adds failed-payment
 * simulation and idempotency keys; M4 adds the Stripe test-mode adapter.
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
    // Deterministic: succeed unless the idempotency key forces a failure (used in tests).
    const shouldFail = idempotencyKey.includes("fail");
    return {
      providerPaymentId: `fake_${crypto.randomUUID()}`,
      status: (shouldFail ? "failed" : "succeeded") as PaymentSessionStatus,
    };
  }
}

/**
 * Stripe test-mode adapter — stubbed in M1. M4 implements the real adapter;
 * tests never call Stripe (mocked at the network boundary).
 */
export class StripePaymentProvider implements PaymentProvider {
  name = "stripe" as const;

  async createPaymentSession(): Promise<{
    providerPaymentId: string;
    status: PaymentSessionStatus;
  }> {
    throw new Error("Stripe adapter not implemented in M1; use the fake provider.");
  }
}

export const paymentProviders: Record<PaymentProviderName, PaymentProvider> = {
  fake: new FakePaymentProvider(),
  stripe: new StripePaymentProvider(),
};

/**
 * Create a PaymentAttempt and (in M2+) an Order for a checkout.
 * M1 placeholder: records the payment attempt in pending_payment state.
 */
export async function createPaymentAttempt(args: {
  userId: string;
  lineItems: Array<{
    variantId: string;
    name: string;
    sku: string;
    unitPrice: number; // cents
    quantity: number;
  }>;
  total: number; // cents
  currency: string;
  provider: PaymentProviderName;
}) {
  const { userId, lineItems, total, currency, provider } = args;
  const providerImpl = paymentProviders[provider];

  const idempotencyKey = `checkout_${userId}_${Date.now()}_${crypto.randomUUID()}`;

  const session = await providerImpl.createPaymentSession({
    amount: total,
    currency,
    idempotencyKey,
    metadata: { userId },
  });

  // M1: create the order in pending_payment state; M2 completes the state machine.
  const order = await prisma.order.create({
    data: {
      orderNumber: `CO-${Date.now().toString(36).toUpperCase()}`,
      userId,
      status: session.status === "succeeded" ? "PAID" : "PENDING_PAYMENT",
      subtotal: total,
      total,
      currency,
      items: {
        create: lineItems.map((item) => ({
          variantId: item.variantId,
          name: item.name,
          sku: item.sku,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        })),
      },
      payments: {
        create: {
          provider,
          providerId: session.status === "succeeded" ? session.providerPaymentId : null,
          idempotencyKey,
          status: session.status === "succeeded" ? "SUCCEEDED" : "FAILED",
          amount: total,
          currency,
        },
      },
    },
    include: { items: true, payments: true },
  });

  return {
    orderId: order.id,
    paymentAttemptId: order.payments[0]?.id,
    status: session.status,
  };
}
