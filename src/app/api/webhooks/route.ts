import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { commitReservation, releaseReservation } from "@/lib/inventory";
import { transitionOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

// M2 webhook endpoint. Processes payment notifications from the fake provider
// (and Stripe in M4) with signature verification and idempotent event handling.
//
// Flow:
// 1. Verify the webhook signature (M4: Stripe; M2: fake provider shared secret).
// 2. Check if the event ID was already processed (idempotency).
// 3. Mark the event as processed.
// 4. Transition the order based on the event type.
// 5. Commit or release inventory accordingly.
export async function POST(req: Request) {
  // M2: simple shared-secret verification for the fake provider.
  // M4 will replace this with Stripe signature verification.
  const signature = req.headers.get("x-commerceops-signature");
  const expected = process.env.WEBHOOK_SECRET || "dev-webhook-secret";
  if (!signature || signature !== expected) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { eventId, type, provider, payload } = body;

    if (!eventId || !type || !provider) {
      return NextResponse.json({ error: "Missing webhook fields." }, { status: 400 });
    }

    // Idempotency: skip already-processed events.
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
        provider,
        type,
        processed: true,
        processedAt: new Date(),
      },
    });

    const orderId = payload.orderId;
    const paymentStatus = payload.status; // "succeeded" | "failed"

    if (type === "payment.succeeded" && orderId) {
      const payment = await prisma.paymentAttempt.findFirst({
        where: { orderId },
      });
      if (payment) {
        await prisma.paymentAttempt.update({
          where: { id: payment.id },
          data: {
            status: "SUCCEEDED",
            providerId: payload.providerPaymentId || null,
          },
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
          await commitReservation({ reservationId: r.id, actorId: order.userId });
        }

        await transitionOrder({
          orderId,
          to: "PAID",
          actorId: order.userId,
          metadata: { provider, eventId },
        });
      }
    }

    if (type === "payment.failed" && orderId) {
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
            reason: "payment_failed",
            actorId: order.userId,
          });
        }

        await transitionOrder({
          orderId,
          to: "CANCELLED",
          actorId: order.userId,
          metadata: { provider, eventId },
        });
      }
    }

    return NextResponse.json({ ok: true, processed: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Webhook processing failed." },
      { status: 400 }
    );
  }
}
