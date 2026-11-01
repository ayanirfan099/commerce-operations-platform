import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();

  const entries = await prisma.inventoryLedgerEntry.findMany({
    include: {
      location: {
        include: { variant: { include: { product: true } } },
      },
      actor: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Build CSV.
  const headers = [
    "date",
    "sku",
    "product",
    "variant",
    "location",
    "change",
    "reason",
    "actor",
  ];

  const rows = entries.map((e) => [
    e.createdAt.toISOString(),
    e.location.variant.sku,
    e.location.variant.product.name,
    e.location.variant.name ?? "",
    e.location.name,
    e.change.toString(),
    e.reason,
    e.actor ? `${e.actor.name || ""} <${e.actor.email}>` : "system",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="inventory-ledger.csv"',
    },
  });
}
