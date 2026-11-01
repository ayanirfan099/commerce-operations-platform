import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const addSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(10),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to add items to your cart." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { variantId, quantity } = addSchema.parse(body);

    // Load variant and its current price/inventory (server-authoritative).
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        inventory: true,
        prices: { take: 1, orderBy: { effectiveFrom: "desc" } },
      },
    });
    if (!variant || !variant.isActive) {
      return NextResponse.json({ error: "Product variant not found." }, { status: 404 });
    }
    const location = variant.inventory[0];
    const available = location ? location.quantity - location.reserved : 0;
    if (available < quantity) {
      return NextResponse.json(
        { error: `Only ${available} unit(s) available.` },
        { status: 400 },
      );
    }

    let cart = await prisma.cart.findUnique({ where: { userId: session.id } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId: session.id } });
    }

    const existing = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, variantId },
    });

    const newQuantity = (existing?.quantity || 0) + quantity;
    if (newQuantity > available) {
      return NextResponse.json(
        { error: `Only ${available} unit(s) available in total.` },
        { status: 400 },
      );
    }

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQuantity },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, variantId, quantity },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
