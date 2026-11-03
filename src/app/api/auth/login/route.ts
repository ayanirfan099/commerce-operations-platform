import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { z } from "zod";
import { cookies } from "next/headers";

const GUEST_SESSION_COOKIE = "commerceops_guest_session";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  callbackUrl: z.string().optional(),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const isFormSubmission =
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data");

    const body = isFormSubmission
      ? Object.fromEntries((await req.formData()).entries())
      : await req.json();
    const { email, password, callbackUrl } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const passwordOk = password === user.passwordHash;
    if (!passwordOk) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Merge guest cart into the authenticated user's cart.
    const cookieStore = await cookies();
    const guestSessionId = cookieStore.get(GUEST_SESSION_COOKIE)?.value;
    if (guestSessionId) {
      const guestCart = await prisma.cart.findUnique({
        where: { sessionId: guestSessionId },
        include: { items: true },
      });
      if (guestCart && guestCart.items.length > 0) {
        let userCart = await prisma.cart.findUnique({ where: { userId: user.id } });
        if (!userCart) {
          userCart = await prisma.cart.create({ data: { userId: user.id } });
        }

        for (const item of guestCart.items) {
          const existing = await prisma.cartItem.findFirst({
            where: { cartId: userCart.id, variantId: item.variantId },
          });
          if (existing) {
            await prisma.cartItem.update({
              where: { id: existing.id },
              data: { quantity: existing.quantity + item.quantity },
            });
          } else {
            await prisma.cartItem.create({
              data: { cartId: userCart.id, variantId: item.variantId, quantity: item.quantity },
            });
          }
        }

        await prisma.cartItem.deleteMany({ where: { cartId: guestCart.id } });
        await prisma.cart.delete({ where: { id: guestCart.id } });

        // Clear the guest session cookie.
        cookieStore.set(GUEST_SESSION_COOKIE, "", {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 0,
        });
      }
    }

    await createSession(user.id);

    if (isFormSubmission) {
      const destination =
        callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
          ? callbackUrl
          : "/";
      return NextResponse.redirect(new URL(destination, req.url), 303);
    }

    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
