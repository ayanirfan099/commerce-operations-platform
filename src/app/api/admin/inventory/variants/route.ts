import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();

  const locations = await prisma.inventoryLocation.findMany({
    include: {
      variant: {
        include: { product: true },
      },
    },
    orderBy: [{ name: "asc" }, { variant: { sku: "asc" } }],
  });

  const variants = locations.map((l) => ({
    id: l.variantId,
    sku: l.variant.sku,
    productName: l.variant.product.name,
    variantName: l.variant.name ?? null,
    available: l.quantity - l.reserved,
  }));

  return NextResponse.json({ variants });
}
