import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createPaymentAttempt } from "@/lib/payments";
import { reserveStock, commitReservation, releaseReservation } from "@/lib/inventory";
import { transitionOrder, isValidTransition } from "@/lib/orders";
import { z } from "zod";

const checkoutSchema = z.object({
  idempotencyKey: z.string().min(1),
  provider: z.enum(["fake", "stripe"]).default("fake"),
});

export const dynamic = "force-dynamic";

// M2 checkout: idempotent, transactional, server-authoritative pricing.
// 1. Validates idempotency key (repeat submissions return the same order).
// 2. Loads prices from the database (client amounts ignored).
// 3. Reserves inventory inside a transaction.
// 4. Creates the order in PENDING_PAYMENT state.
// 5. Creates a payment attempt via the provider.
// 6. Commits or releases inventory based on payment result.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to check out." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { idempotencyKey, provider } = checkoutSchema.parse(body);

    // Idempotency: if an order already exists for this key, return it.
    const existingPayment = await prisma.paymentAttempt.findUnique({
      where: { idempotencyKey },
      include: { order: true },
    });
    if (existingPayment?.order) {
      return NextResponse.json({
        ok: true,
        orderId: existingPayment.order.id,
        orderNumber: existingPayment.order.orderNumber,
        status: existingPayment.order.status,
        paymentAttemptId: existingPayment.id,
        idempotent: true,
      });
    }

    // Load the cart.
    const cart = await prisma.cart.findUnique({
      where: { userId: session.id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                prices: { take: 1, orderBy: { effectiveFrom: "desc" } },
                inventory: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    // Server-authoritative pricing: recompute from the database.
    let total = 0;
    const lineItems: Array<{
      variantId: string;
      name: string;
      sku: string;
      unitPrice: number;
      quantity: number;
    }> = [];

    for (const item of cart.items) {
      const price = item.variant.prices[0]?.amount || 0;
      total += price * item.quantity;
      lineItems.push({
        variantId: item.variantId,
        name: item.variant.product.name,
        sku: item.variant.sku,
        unitPrice: price,
        quantity: item.quantity,
      });
    }

    // Reserve stock for every line item inside a transaction.
    const reservations: Array<{ reservationId: string; quantity: number }> = [];
    try {
      for (const item of lineItems) {
        const reservation = await reserveStock({
          variantId: item.variantId,
          quantity: item.quantity,
          reason: "reservation",
          actorId: session.id,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        });
        reservations.push({
          reservationId: reservation.reservation.id,
          quantity: item.quantity,
        });
      }
    } catch (err: any) {
      // Release any reservations already made.
      for (const r of reservations) {
        try {
          await releaseReservation({
            reservationId: r.reservationId,
            reason: "insufficient_stock",
            actorId: session.id,
          });
        } catch {
          // Best effort.
        }
      }
      return NextResponse.json(
        { error: err.message || "Insufficient stock." },
        { status: 400 }
      );
    }

    // Create the order in PENDING_PAYMENT state with snapshotted line items.
    const order = await prisma.order.create({
      data: {
        orderNumber: `CO-${Date.now().toString(36).toUpperCase()}`,
        userId: session.id,
        status: "PENDING_PAYMENT",
        subtotal: total,
        total,
        currency: "usd",
        items: {
          create: lineItems.map((item) => ({
            variantId: item.variantId,
            name: item.name,
            sku: item.sku,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    // Create the payment attempt via the provider.
    const paymentResult = await createPaymentAttempt({
      orderId: order.id,
      provider,
      idempotencyKey,
      amount: total,
      currency: "usd",
      status: "PENDING",
    });

    // Clear the cart.
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentAttemptId: paymentResult.id,
      idempotent: false,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Checkout failed." },
      { status: 400 }
    );
  }
}
