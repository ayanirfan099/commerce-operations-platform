import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import { cookies } from "next/headers";

const GUEST_SESSION_COOKIE = "commerceops_guest_session";

const addSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(10),
  returnTo: z.string().optional(),
});

export const dynamic = "force-dynamic";

async function getOrCreateGuestSessionId(): Promise<string> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(GUEST_SESSION_COOKIE)?.value;
  if (!sessionId) {
    sessionId = `guest_${crypto.randomUUID()}`;
    cookieStore.set(GUEST_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
  }
  return sessionId;
}

export async function POST(req: Request) {
  const session = await getSession();
  const guestSessionId = await getOrCreateGuestSessionId();

  try {
    const contentType = req.headers.get("content-type") || "";
    const isFormSubmission =
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data");

    const body = isFormSubmission
      ? Object.fromEntries((await req.formData()).entries())
      : await req.json();
    const { variantId, quantity, returnTo } = addSchema.parse(body);

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
        { status: 400 }
      );
    }

    // Find or create the cart (authenticated or guest).
    let cart;
    if (session) {
      cart = await prisma.cart.findUnique({ where: { userId: session.id } });
      if (!cart) {
        cart = await prisma.cart.create({ data: { userId: session.id } });
      }
    } else {
      cart = await prisma.cart.findUnique({ where: { sessionId: guestSessionId } });
      if (!cart) {
        cart = await prisma.cart.create({ data: { sessionId: guestSessionId } });
      }
    }

    const existing = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, variantId },
    });

    const newQuantity = (existing?.quantity || 0) + quantity;
    if (newQuantity > available) {
      return NextResponse.json(
        { error: `Only ${available} unit(s) available in total.` },
        { status: 400 }
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

    if (isFormSubmission) {
      const destination =
        returnTo?.startsWith("/") && !returnTo.startsWith("//")
          ? returnTo
          : "/cart";
      return NextResponse.redirect(new URL(destination, req.url), 303);
    }

    return NextResponse.json({ ok: true, cartId: cart.id, isGuest: !session });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
