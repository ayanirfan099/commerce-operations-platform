import { vi } from "vitest";

// Mock @prisma/client so unit tests run without a live database.
vi.mock("@prisma/client", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    PrismaClient: vi.fn(() => ({
      $connect: vi.fn(),
      $disconnect: vi.fn(),
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      category: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      product: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      productVariant: {
        findUnique: vi.fn(),
      },
      price: {
        findMany: vi.fn(),
      },
      inventoryLocation: {
        findMany: vi.fn(),
      },
      cart: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      cartItem: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
      order: {
        create: vi.fn(),
      },
      discountCode: {
        findUnique: vi.fn(),
      },
    })),
  };
});
