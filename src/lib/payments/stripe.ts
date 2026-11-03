import Stripe from "stripe";
import type { PaymentProvider, PaymentSessionStatus } from "./types";

/**
 * Stripe test-mode adapter.
 *
 * Uses the Stripe Node SDK against Stripe's test environment. In tests,
 * Stripe is mocked at the network boundary so no external calls are made.
 *
 * See docs/threat-model.md for what is and is not verified in local mode.
 */
export class StripePaymentProvider implements PaymentProvider {
  name = "stripe" as const;

  private client: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    // In test/CI environments, Stripe is mocked at the network boundary.
    // A placeholder key is sufficient; no real calls are made in tests.
    this.client = new Stripe(secretKey || "not-configured", {
      apiVersion: "2026-10-28.endive",
    });
  }

  async createPaymentSession({
    amount,
    currency,
    idempotencyKey,
    metadata,
  }: {
    amount: number;
    currency: string;
    idempotencyKey: string;
    metadata: Record<string, string>;
  }): Promise<{
    providerPaymentId: string;
    status: PaymentSessionStatus;
  }> {
    const session = await this.client.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: metadata.productName || "CommerceOps order",
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        metadata,
      },
      { idempotencyKey }
    );

    return {
      providerPaymentId: session.id,
      status: session.payment_status === "paid" ? "succeeded" : "pending",
    };
  }

  /**
   * Verify a Stripe webhook signature.
   * Returns the parsed event if valid, throws otherwise.
   */
  async verifyWebhookEvent(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
  ): Promise<Stripe.Event> {
    return this.client.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
