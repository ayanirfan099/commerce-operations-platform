import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  reserveStock,
  commitReservation,
  releaseReservation,
  getAvailableStock,
} from "@/lib/inventory";

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
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("reserveStock", () => {
  it("reserves stock when available", async () => {
    const location = {
      id: "loc_1",
      variantId: "var_1",
      quantity: 10,
      reserved: 2,
    };

    (mockPrisma.inventoryLocation.findFirst as any).mockResolvedValue(location);
    (mockPrisma.inventoryLocation.update as any).mockResolvedValue({
      ...location,
      reserved: 7,
    });
    (mockPrisma.inventoryLedgerEntry.create as any).mockResolvedValue({});
    (mockPrisma.inventoryReservation.create as any).mockResolvedValue({
      id: "res_1",
      status: "ACTIVE",
    });

    const result = await reserveStock({
      variantId: "var_1",
      quantity: 5,
      reason: "reservation",
      actorId: "user_1",
      expiresAt: new Date("2026-12-01"),
    });

    expect(mockPrisma.inventoryLocation.update).toHaveBeenCalledWith({
      where: { id: "loc_1" },
      data: { reserved: 7 },
    });
    expect(result.reservation.id).toBe("res_1");
  });

  it("throws when insufficient stock", async () => {
    const location = {
      id: "loc_1",
      variantId: "var_1",
      quantity: 3,
      reserved: 2,
    };

    (mockPrisma.inventoryLocation.findFirst as any).mockResolvedValue(location);

    await expect(
      reserveStock({
        variantId: "var_1",
        quantity: 5,
        reason: "reservation",
        actorId: "user_1",
        expiresAt: new Date("2026-12-01"),
      })
    ).rejects.toThrow("Insufficient stock");
  });

  it("throws when no location exists", async () => {
    (mockPrisma.inventoryLocation.findFirst as any).mockResolvedValue(null);

    await expect(
      reserveStock({
        variantId: "var_1",
        quantity: 1,
        reason: "reservation",
        actorId: "user_1",
        expiresAt: new Date("2026-12-01"),
      })
    ).rejects.toThrow("No inventory location");
  });
});

describe("commitReservation", () => {
  it("commits an active reservation", async () => {
    const reservation = {
      id: "res_1",
      locationId: "loc_1",
      variantId: "var_1",
      quantity: 5,
      status: "ACTIVE",
    };

    (mockPrisma.inventoryReservation.findUnique as any).mockResolvedValue(
      reservation
    );
    (mockPrisma.inventoryReservation.update as any).mockResolvedValue({
      ...reservation,
      status: "COMMITTED",
    });
    (mockPrisma.inventoryLedgerEntry.create as any).mockResolvedValue({});

    const result = await commitReservation({ reservationId: "res_1" });

    expect(result.status).toBe("COMMITTED");
    expect(mockPrisma.inventoryLedgerEntry.create).toHaveBeenCalledWith({
      data: {
        locationId: "loc_1",
        variantId: "var_1",
        change: 0,
        reason: "commit",
        actorId: undefined,
      },
    });
  });

  it("throws when reservation is not active", async () => {
    (mockPrisma.inventoryReservation.findUnique as any).mockResolvedValue({
      id: "res_1",
      status: "COMMITTED",
    });

    await expect(commitReservation({ reservationId: "res_1" })).rejects.toThrow(
      "is not active"
    );
  });
});

describe("releaseReservation", () => {
  it("releases an active reservation and returns stock", async () => {
    const reservation = {
      id: "res_1",
      locationId: "loc_1",
      variantId: "var_1",
      quantity: 5,
      status: "ACTIVE",
    };

    (mockPrisma.inventoryReservation.findUnique as any).mockResolvedValue(
      reservation
    );
    (mockPrisma.inventoryLocation.update as any).mockResolvedValue({});
    (mockPrisma.inventoryReservation.update as any).mockResolvedValue({
      ...reservation,
      status: "RELEASED",
    });
    (mockPrisma.inventoryLedgerEntry.create as any).mockResolvedValue({});

    const result = await releaseReservation({
      reservationId: "res_1",
      reason: "cancelled",
      actorId: "user_1",
    });

    expect(result.updated.status).toBe("RELEASED");
    expect(mockPrisma.inventoryLocation.update).toHaveBeenCalledWith({
      where: { id: "loc_1" },
      data: { reserved: { decrement: 5 } },
    });
    expect(mockPrisma.inventoryLedgerEntry.create).toHaveBeenCalledWith({
      data: {
        locationId: "loc_1",
        variantId: "var_1",
        change: 5,
        reason: "cancelled",
        actorId: "user_1",
      },
    });
  });
});

describe("getAvailableStock", () => {
  it("returns quantity minus reserved", async () => {
    (mockPrisma.inventoryLocation.findFirst as any).mockResolvedValue({
      id: "loc_1",
      quantity: 20,
      reserved: 7,
    });

    const available = await getAvailableStock("var_1");
    expect(available).toBe(13);
  });

  it("returns 0 when no location", async () => {
    (mockPrisma.inventoryLocation.findFirst as any).mockResolvedValue(null);
    const available = await getAvailableStock("var_1");
    expect(available).toBe(0);
  });
});
