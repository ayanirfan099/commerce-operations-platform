import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const adjustSchema = z.object({
  variantId: z.string().uuid(),
  change: z.coerce.number().int(),
  reason: z.string().min(1, "Reason is required"),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await requireAdmin();

  try {
    const body = await req.json();
    const { variantId, change, reason } = adjustSchema.parse(body);

    const location = await prisma.inventoryLocation.findFirst({
      where: { variantId },
    });
    if (!location) {
      return NextResponse.json(
        { error: "No inventory location for this variant." },
        { status: 404 }
      );
    }

    const newAvailable = location.quantity - location.reserved + change;
    if (newAvailable < 0) {
      return NextResponse.json(
        { error: `Adjustment would drive available stock below zero (currently ${location.quantity - location.reserved} available).` },
        { status: 400 }
      );
    }

    const reasonLabel = change > 0 ? "restock" : change < 0 ? "adjustment" : "adjustment";

    await prisma.$transaction(async (tx) => {
      // Update quantity for positive changes, reserved for negative changes.
      // For simplicity: positive = add to quantity, negative = remove from quantity.
      if (change > 0) {
        await tx.inventoryLocation.update({
          where: { id: location.id },
          data: { quantity: { increment: change } },
        });
      } else if (change < 0) {
        const removal = Math.abs(change);
        if (location.quantity < removal) {
          throw new Error("Not enough on-hand stock to remove.");
        }
        await tx.inventoryLocation.update({
          where: { id: location.id },
          data: { quantity: { decrement: removal } },
        });
      }

      await tx.inventoryLedgerEntry.create({
        data: {
          locationId: location.id,
          variantId,
          change,
          reason,
          actorId: session.id,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Adjustment failed." },
      { status: 400 }
    );
  }
}
