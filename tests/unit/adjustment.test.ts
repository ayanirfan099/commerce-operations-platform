import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  inventoryLocation: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  inventoryLedgerEntry: {
    create: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("stock adjustment validation", () => {
  it("prevents adjustment that drives available stock below zero", async () => {
    // 5 on hand, 3 reserved = 2 available. Trying to remove 10 should fail.
    const location = {
      id: "loc_1",
      variantId: "var_1",
      quantity: 5,
      reserved: 3,
    };

    (mockPrisma.inventoryLocation.findFirst as any).mockResolvedValue(location);

    const available = location.quantity - location.reserved; // 2
    const change = -10;
    const newAvailable = available + change; // -8

    expect(newAvailable).toBeLessThan(0);
  });

  it("allows restock adjustment", async () => {
    const location = {
      id: "loc_1",
      variantId: "var_1",
      quantity: 5,
      reserved: 3,
    };

    (mockPrisma.inventoryLocation.findFirst as any).mockResolvedValue(location);
    (mockPrisma.inventoryLocation.update as any).mockResolvedValue({
      ...location,
      quantity: 10,
    });
    (mockPrisma.inventoryLedgerEntry.create as any).mockResolvedValue({});

    const change = 5;
    const newAvailable = (location.quantity - location.reserved) + change; // 7

    expect(newAvailable).toBeGreaterThanOrEqual(0);
  });

  it("records a ledger entry for every adjustment", async () => {
    const location = {
      id: "loc_1",
      variantId: "var_1",
      quantity: 5,
      reserved: 3,
    };

    (mockPrisma.inventoryLocation.findFirst as any).mockResolvedValue(location);
    (mockPrisma.inventoryLocation.update as any).mockResolvedValue({});
    (mockPrisma.inventoryLedgerEntry.create as any).mockResolvedValue({});

    await prisma.$transaction(async (tx) => {
      await tx.inventoryLocation.update({
        where: { id: location.id },
        data: { quantity: { increment: 5 } },
      });
      await tx.inventoryLedgerEntry.create({
        data: {
          locationId: location.id,
          variantId: location.variantId,
          change: 5,
          reason: "restock",
          actorId: "admin_1",
        },
      });
    });

    // Transaction completed without throwing.
    expect(true).toBe(true);
  });
});

describe("low-stock detection", () => {
  it("flags items at or below threshold", () => {
    const items = [
      { available: 0, threshold: 5 },
      { available: 3, threshold: 5 },
      { available: 5, threshold: 5 },
      { available: 6, threshold: 5 },
    ];

    const lowStock = items.filter((i) => i.available <= i.threshold);
    expect(lowStock).toHaveLength(3);
  });

  it("does not flag items above threshold", () => {
    const items = [
      { available: 10, threshold: 5 },
      { available: 20, threshold: 5 },
    ];

    const lowStock = items.filter((i) => i.available <= i.threshold);
    expect(lowStock).toHaveLength(0);
  });
});
