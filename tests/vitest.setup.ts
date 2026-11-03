import { vi } from "vitest";

const modelMock = {
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  upsert: vi.fn(),
};

function createModels() {
  return {
    user: { ...modelMock },
    category: { ...modelMock },
    product: { ...modelMock },
    productVariant: { ...modelMock },
    price: { ...modelMock },
    productImage: { ...modelMock },
    inventoryLocation: { ...modelMock },
    inventoryLedgerEntry: { ...modelMock },
    inventoryReservation: { ...modelMock },
    cart: { ...modelMock },
    cartItem: { ...modelMock },
    order: { ...modelMock },
    orderItem: { ...modelMock },
    discountCode: { ...modelMock },
    paymentAttempt: { ...modelMock },
    webhookEvent: { ...modelMock },
    refundRecord: { ...modelMock },
    auditEvent: { ...modelMock },
    address: { ...modelMock },
  };
}

type TransactionClient = ReturnType<typeof createModels>;
type TransactionCallback = (
  tx: TransactionClient
) => unknown | Promise<unknown>;

// Mock @prisma/client so unit tests run without a live database.
vi.mock("@prisma/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@prisma/client")>();
  const connect = vi.fn();
  const disconnect = vi.fn();
  const transaction = vi.fn(async (callback: TransactionCallback) =>
    callback(createModels())
  );

  return {
    ...actual,
    PrismaClient: vi.fn(() => ({
      ...createModels(),
      $connect: connect,
      $disconnect: disconnect,
      $transaction: transaction,
    })),
  };
});
