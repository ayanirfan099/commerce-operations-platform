export type PaymentProviderName = "fake" | "stripe";

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
