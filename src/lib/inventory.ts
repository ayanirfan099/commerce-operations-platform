import { prisma } from "./prisma";

/**
 * Inventory operations.
 *
 * All stock changes flow through the ledger (InventoryLedgerEntry). Available
 * inventory = quantity - reserved. Reservations are time-boxed and are either
 * committed (sold) or released (cancelled/expired).
 */

export async function reserveStock(args: {
  variantId: string;
  quantity: number;
  reason: string;
  actorId?: string;
  expiresAt: Date;
}) {
  const { variantId, quantity, reason, actorId, expiresAt } = args;

  // Find the location with stock for this variant.
  const location = await prisma.inventoryLocation.findFirst({
    where: { variantId },
    orderBy: { name: "asc" },
  });
  if (!location) {
    throw new Error(`No inventory location for variant ${variantId}`);
  }

  const available = location.quantity - location.reserved;
  if (available < quantity) {
    throw new Error(
      `Insufficient stock: only ${available} unit(s) available for variant ${variantId}`
    );
  }

  // Reserve stock inside a transaction: update the counter and append a ledger entry.
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.inventoryLocation.update({
      where: { id: location.id },
      data: { reserved: location.reserved + quantity },
    });

    const ledger = await tx.inventoryLedgerEntry.create({
      data: {
        locationId: location.id,
        variantId,
        change: -quantity,
        reason,
        actorId,
      },
    });

    const reservation = await tx.inventoryReservation.create({
      data: {
        locationId: location.id,
        variantId,
        quantity,
        expiresAt,
        status: "ACTIVE",
      },
    });

    return { updated, ledger, reservation };
  });

  return result;
}

export async function commitReservation(args: {
  reservationId: string;
  actorId?: string;
}) {
  const { reservationId, actorId } = args;

  return prisma.$transaction(async (tx) => {
    const reservation = await tx.inventoryReservation.findUnique({
      where: { id: reservationId },
    });
    if (!reservation) {
      throw new Error(`Reservation ${reservationId} not found`);
    }
    if (reservation.status !== "ACTIVE") {
      throw new Error(`Reservation ${reservationId} is not active`);
    }

    // Mark the reservation committed and append a ledger entry.
    const updated = await tx.inventoryReservation.update({
      where: { id: reservationId },
      data: { status: "COMMITTED" },
    });

    await tx.inventoryLedgerEntry.create({
      data: {
        locationId: reservation.locationId,
        variantId: reservation.variantId,
        change: 0, // stock already removed from available via reservation
        reason: "commit",
        actorId,
      },
    });

    return updated;
  });
}

export async function releaseReservation(args: {
  reservationId: string;
  reason: string;
  actorId?: string;
}) {
  const { reservationId, reason, actorId } = args;

  return prisma.$transaction(async (tx) => {
    const reservation = await tx.inventoryReservation.findUnique({
      where: { id: reservationId },
    });
    if (!reservation) {
      throw new Error(`Reservation ${reservationId} not found`);
    }
    if (reservation.status !== "ACTIVE") {
      throw new Error(`Reservation ${reservationId} is not active`);
    }

    // Return reserved stock to available and append a ledger entry.
    const location = await tx.inventoryLocation.update({
      where: { id: reservation.locationId },
      data: { reserved: { decrement: reservation.quantity } },
    });

    const updated = await tx.inventoryReservation.update({
      where: { id: reservationId },
      data: { status: "RELEASED" },
    });

    await tx.inventoryLedgerEntry.create({
      data: {
        locationId: reservation.locationId,
        variantId: reservation.variantId,
        change: reservation.quantity,
        reason,
        actorId,
      },
    });

    return { location, updated };
  });
}

export async function expireReservations() {
  // Mark expired reservations and release their stock.
  const expired = await prisma.inventoryReservation.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lt: new Date() },
    },
  });

  const results = await Promise.all(
    expired.map((r) =>
      releaseReservation({ reservationId: r.id, reason: "expiry" })
    )
  );

  return results;
}

export async function getAvailableStock(variantId: string): Promise<number> {
  const location = await prisma.inventoryLocation.findFirst({
    where: { variantId },
  });
  if (!location) return 0;
  return location.quantity - location.reserved;
}
