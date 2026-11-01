import type { PaymentProvider, PaymentSessionStatus } from "./types";

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
