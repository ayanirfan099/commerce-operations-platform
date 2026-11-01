import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createPaymentAttempt } from "@/lib/payments";

export const dynamic = "force-dynamic";

// M1 placeholder checkout using the deterministic fake payment provider.
// M2 replaces this with the full idempotent checkout flow; M4 adds Stripe.
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to check out." }, { status: 401 });
  }

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

  try {
    // M1: create the order in pending_payment state using the fake provider.
    const result = await createPaymentAttempt({
      userId: session.id,
      lineItems,
      total,
      currency: "usd",
      provider: "fake",
    });

    // Clear the cart after a successful order creation.
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return NextResponse.json({
      ok: true,
      orderId: result.orderId,
      paymentIntentId: result.paymentAttemptId,
      status: result.status,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Checkout failed." },
      { status: 400 },
    );
  }
}
