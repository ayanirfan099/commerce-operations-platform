import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { createPaymentAttempt } from "@/lib/payments";

const mockPrisma = prisma as unknown as {
  paymentAttempt: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createPaymentAttempt idempotency", () => {
  it("creates a new attempt when no existing key", async () => {
    (mockPrisma.paymentAttempt.findUnique as any).mockResolvedValue(null);
    (mockPrisma.paymentAttempt.create as any).mockResolvedValue({
      id: "pay_1",
      idempotencyKey: "key_1",
      status: "SUCCEEDED",
    });

    const result = await createPaymentAttempt({
      orderId: "order_1",
      provider: "fake",
      idempotencyKey: "key_1",
      amount: 1000,
      currency: "usd",
      status: "SUCCEEDED",
    });

    expect(result.id).toBe("pay_1");
    expect(mockPrisma.paymentAttempt.create).toHaveBeenCalledTimes(1);
  });

  it("returns existing attempt for same idempotency key", async () => {
    (mockPrisma.paymentAttempt.findUnique as any).mockResolvedValue({
      id: "pay_existing",
      idempotencyKey: "key_1",
      status: "SUCCEEDED",
    });

    const result = await createPaymentAttempt({
      orderId: "order_1",
      provider: "fake",
      idempotencyKey: "key_1",
      amount: 1000,
      currency: "usd",
      status: "SUCCEEDED",
    });

    expect(result.id).toBe("pay_existing");
    expect(mockPrisma.paymentAttempt.create).not.toHaveBeenCalled();
  });
});
