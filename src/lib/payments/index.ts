import { FakePaymentProvider } from "./fake";
import { StripePaymentProvider } from "./stripe";
import type { PaymentProviderName, PaymentSessionStatus, PaymentProvider } from "./types";

export type { PaymentProviderName, PaymentSessionStatus, PaymentProvider } from "./types";
export { FakePaymentProvider, StripePaymentProvider };

export const paymentProviders: Record<PaymentProviderName, PaymentProvider> = {
  fake: new FakePaymentProvider(),
  stripe: new StripePaymentProvider(),
};
