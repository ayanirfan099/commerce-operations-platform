import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { reserveStock, releaseReservation } from "@/lib/inventory";

const mockPrisma = prisma as unknown as {
  inventoryLocation: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  inventoryLedgerEntry: {
    create: ReturnType<typeof vi.fn>;
  };
  inventoryReservation: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("concurrent inventory (two buyers for final stock)", () => {
  it("only one buyer can reserve the final unit", async () => {
    // Mutable state to simulate the database counter.
    let reserved = 0;
    const quantity = 1;

    (mockPrisma.inventoryLocation.findFirst).mockResolvedValue({
      id: "loc_1",
      variantId: "var_1",
      quantity,
      get reserved() {
        return reserved;
      },
    });

    (mockPrisma.inventoryLocation.update).mockImplementation(async () => {
      reserved += 1;
      return { id: "loc_1", variantId: "var_1", quantity, reserved };
    });
    (mockPrisma.inventoryLedgerEntry.create).mockResolvedValue({});
    (mockPrisma.inventoryReservation.create).mockResolvedValue({
      id: "res_1",
      status: "ACTIVE",
    });

    // Buyer 1 reserves the final unit.
    const result1 = await reserveStock({
      variantId: "var_1",
      quantity: 1,
      reason: "reservation",
      actorId: "buyer_1",
      expiresAt: new Date("2026-12-01"),
    });
    expect(result1.reservation.id).toBe("res_1");
    expect(reserved).toBe(1);

    // Buyer 2 attempts to reserve the same final unit.
    // Available = quantity - reserved = 1 - 1 = 0, so this should throw.
    await expect(
      reserveStock({
        variantId: "var_1",
        quantity: 1,
        reason: "reservation",
        actorId: "buyer_2",
        expiresAt: new Date("2026-12-01"),
      })
    ).rejects.toThrow("Insufficient stock");
  });

  it("released stock becomes available again", async () => {
    const reservation = {
      id: "res_1",
      locationId: "loc_1",
      variantId: "var_1",
      quantity: 1,
      status: "ACTIVE",
    };

    (mockPrisma.inventoryReservation.findUnique).mockResolvedValue(
      reservation
    );
    (mockPrisma.inventoryLocation.update).mockResolvedValue({});
    (mockPrisma.inventoryReservation.update).mockResolvedValue({
      ...reservation,
      status: "RELEASED",
    });
    (mockPrisma.inventoryLedgerEntry.create).mockResolvedValue({});

    await releaseReservation({
      reservationId: "res_1",
      reason: "cancelled",
      actorId: "buyer_1",
    });

    expect(mockPrisma.inventoryLocation.update).toHaveBeenCalledWith({
      where: { id: "loc_1" },
      data: { reserved: { decrement: 1 } },
    });
  });
});
