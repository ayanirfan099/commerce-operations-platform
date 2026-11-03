import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { StripePaymentProvider } from "@/lib/payments/stripe";
import { commitReservation, releaseReservation } from "@/lib/inventory";
import { transitionOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

// M4 Stripe webhook endpoint. Processes Stripe webhook events with:
// 1. Signature verification before any processing (threat model T2).
// 2. Event-id idempotency — events processed once (threat model T3).
// 3. Order transitions + inventory commit/release based on payment outcome.
//
// Tests never call Stripe; this handler is tested with synthetic payloads
// and signature verification is tested separately (threat model T2).
export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  // Stripe sends the raw body; we must use it for signature verification.
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 401 });
  }

  // Verify signature before processing (threat model T2).
  const provider = new StripePaymentProvider();
  let event: Stripe.Event;
  try {
    event = await provider.verifyWebhookEvent(payload, signature, webhookSecret);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown verification error";
    return NextResponse.json(
      { error: `Invalid signature: ${message}` },
      { status: 401 }
    );
  }

  const { id: eventId, type } = event;

  // Idempotency: skip already-processed events (threat model T3).
  const existing = await prisma.webhookEvent.findUnique({
    where: { eventId },
  });
  if (existing) {
    return NextResponse.json({ ok: true, processed: false, reason: "duplicate" });
  }

  // Mark the event as processed.
  await prisma.webhookEvent.create({
    data: {
      eventId,
      provider: "stripe",
      type,
      processed: true,
      processedAt: new Date(),
    },
  });

  const stripeObject = event.data.object as Stripe.Checkout.Session & {
    metadata?: Record<string, string>;
  };
  const orderId = stripeObject.metadata?.orderId;
  const paymentStatus = stripeObject.payment_status; // "paid" | "unpaid" | ...

  if (type === "checkout.session.completed" && orderId) {
    // Commit inventory and transition order to PAID.
    const payment = await prisma.paymentAttempt.findFirst({
      where: { orderId },
    });
    if (payment) {
      await prisma.paymentAttempt.update({
        where: { id: payment.id },
        data: { status: "SUCCEEDED", providerId: stripeObject.id },
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (order) {
      const reservations = await prisma.inventoryReservation.findMany({
        where: {
          variantId: { in: order.items.map((i) => i.variantId) },
          status: "ACTIVE",
        },
      });
      for (const r of reservations) {
        await commitReservation({ reservationId: r.id, actorId: order.userId ?? undefined });
      }

      await transitionOrder({
        orderId,
        to: "PAID",
        actorId: order.userId ?? undefined,
        metadata: { provider: "stripe", eventId },
      });
    }
  }

  if (type === "checkout.session.expired" && orderId) {
    // Release inventory and transition order to CANCELLED.
    const payment = await prisma.paymentAttempt.findFirst({
      where: { orderId },
    });
    if (payment) {
      await prisma.paymentAttempt.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (order) {
      const reservations = await prisma.inventoryReservation.findMany({
        where: {
          variantId: { in: order.items.map((i) => i.variantId) },
          status: "ACTIVE",
        },
      });
      for (const r of reservations) {
        await releaseReservation({
          reservationId: r.id,
          reason: "checkout_expired",
          actorId: order.userId ?? undefined,
        });
      }

      await transitionOrder({
        orderId,
        to: "CANCELLED",
        actorId: order.userId ?? undefined,
        metadata: { provider: "stripe", eventId },
      });
    }
  }

  return NextResponse.json({ ok: true, processed: true });
}
