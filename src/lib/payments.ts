import { prisma } from "./prisma";
import {
  paymentProviders,
  type PaymentProvider,
  type PaymentProviderName,
  type PaymentSessionStatus,
} from "./payments/index";

export type { PaymentProvider, PaymentProviderName, PaymentSessionStatus };
export { paymentProviders, FakePaymentProvider } from "./payments/index";
export { StripePaymentProvider } from "./payments/stripe";

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
