import { vi } from "vitest";

// Mock @prisma/client so unit tests run without a live database.
vi.mock("@prisma/client", async (importOriginal) => {
  const actual: any = await importOriginal();
  const baseMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn(async (callback: any) => {
      // $transaction receives a callback with a transaction client.
      const tx = {
        user: { ...baseMock },
        category: { ...baseMock },
        product: { ...baseMock },
        productVariant: { ...baseMock },
        price: { ...baseMock },
        productImage: { ...baseMock },
        inventoryLocation: { ...baseMock },
        inventoryLedgerEntry: { ...baseMock },
        inventoryReservation: { ...baseMock },
        cart: { ...baseMock },
        cartItem: { ...baseMock },
        order: { ...baseMock },
        orderItem: { ...baseMock },
        discountCode: { ...baseMock },
        paymentAttempt: { ...baseMock },
        webhookEvent: { ...baseMock },
        refundRecord: { ...baseMock },
        auditEvent: { ...baseMock },
        address: { ...baseMock },
      };
      return callback(tx);
    }),
  };

  return {
    ...actual,
    PrismaClient: vi.fn(() => ({
      user: { ...baseMock },
      category: { ...baseMock },
      product: { ...baseMock },
      productVariant: { ...baseMock },
      price: { ...baseMock },
      productImage: { ...baseMock },
      inventoryLocation: { ...baseMock },
      inventoryLedgerEntry: { ...baseMock },
      inventoryReservation: { ...baseMock },
      cart: { ...baseMock },
      cartItem: { ...baseMock },
      order: { ...baseMock },
      orderItem: { ...baseMock },
      discountCode: { ...baseMock },
      paymentAttempt: { ...baseMock },
      webhookEvent: { ...baseMock },
      refundRecord: { ...baseMock },
      auditEvent: { ...baseMock },
      address: { ...baseMock },
      $connect: baseMock.$connect,
      $disconnect: baseMock.$disconnect,
      $transaction: baseMock.$transaction,
    })),
  };
});
