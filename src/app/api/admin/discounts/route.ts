import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const discountSchema = z.object({
  code: z.string().min(1).max(32).toUpperCase(),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.coerce.number().positive(),
  minSubtotal: z.coerce.number().nonnegative().default(0),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date(),
  usageLimit: z.coerce.number().int().positive().optional(),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await requireAdmin();

  try {
    const body = await req.json();
    const { code, type, value, minSubtotal, validFrom, validTo, usageLimit } =
      discountSchema.parse(body);

    if (validTo <= validFrom) {
      return NextResponse.json(
        { error: "validTo must be after validFrom." },
        { status: 400 }
      );
    }

    if (type === "PERCENTAGE" && value > 100) {
      return NextResponse.json(
        { error: "Percentage cannot exceed 100." },
        { status: 400 }
      );
    }

    const existing = await prisma.discountCode.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: "A discount code with this code already exists." }, { status: 400 });
    }

    const amountCents = type === "FIXED" ? Math.round(value * 100) : Math.round(value);

    const discount = await prisma.discountCode.create({
      data: {
        code,
        type,
        value: amountCents,
        minSubtotal: Math.round(minSubtotal * 100),
        validFrom,
        validTo,
        usageLimit: usageLimit || null,
        isActive: true,
      },
    });

    // Audit log.
    await prisma.auditEvent.create({
      data: {
        actorId: session.id,
        action: "discount.create",
        targetType: "DiscountCode",
        targetId: discount.id,
        metadata: { code, type, value },
      },
    });

    return NextResponse.json({ ok: true, discountId: discount.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create discount code." }, { status: 400 });
  }
}
