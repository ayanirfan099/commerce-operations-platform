import { prisma } from "./prisma";
import type { OrderStatus } from "@prisma/client";
export type { OrderStatus } from "@prisma/client";

/**
 * Order state machine.
 *
 * Allowed transitions:
 *   PENDING_PAYMENT -> PAID
 *   PENDING_PAYMENT -> CANCELLED
 *   PAID -> PROCESSING
 *   PAID -> CANCELLED (refund required)
 *   PAID -> REFUNDED
 *   PROCESSING -> FULFILLED
 *   PROCESSING -> CANCELLED (refund required)
 *   FULFILLED -> REFUNDED
 *   CANCELLED -> (terminal)
 *   REFUNDED -> (terminal)
 *
 * Invalid transitions are rejected. Every transition records the actor.
 */

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED", "REFUNDED"],
  PROCESSING: ["FULFILLED", "CANCELLED"],
  FULFILLED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export type OrderTransition = {
  from: OrderStatus;
  to: OrderStatus;
  actorId?: string;
  metadata?: Record<string, unknown>;
};

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function transitionOrder(args: {
  orderId: string;
  to: OrderStatus;
  actorId?: string;
  metadata?: Record<string, unknown>;
}) {
  const { orderId, to, actorId, metadata } = args;

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const from = order.status as OrderStatus;
    if (!isValidTransition(from, to)) {
      throw new Error(
        `Invalid order transition: ${from} -> ${to} for order ${orderId}`
      );
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: to },
    });

    await tx.auditEvent.create({
      data: {
        actorId,
        action: `order.${to.toLowerCase()}`,
        targetType: "Order",
        targetId: orderId,
        metadata: {
          from,
          to,
          ...metadata,
        },
      },
    });

    return updated;
  });
}

export async function getOrderWithItems(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payments: true },
  });
}
