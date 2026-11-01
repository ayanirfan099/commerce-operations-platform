import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  description: z.string().optional(),
  sku: z.string().min(1),
  categoryId: z.string().optional().nullable(),
  price: z.coerce.number().positive(),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await requireAdmin();

  try {
    const body = await req.json();
    const { name, slug, description, sku, categoryId, price } = productSchema.parse(body);

    // Check slug uniqueness.
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "A product with this slug already exists." }, { status: 400 });
    }

    // Check SKU uniqueness.
    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) {
      return NextResponse.json({ error: "A product with this SKU already exists." }, { status: 400 });
    }

    const amount = Math.round(price * 100); // dollars to cents

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          name,
          slug,
          description,
          sku,
          categoryId: categoryId || null,
          isActive: true,
        },
      });

      // Create a default variant.
      const variant = await tx.productVariant.create({
        data: {
          productId: p.id,
          sku: sku + "-001",
          name: "Default",
          isActive: true,
        },
      });

      // Create the price.
      await tx.price.create({
        data: {
          variantId: variant.id,
          amount,
          currency: "usd",
        },
      });

      // Initial inventory.
      await tx.inventoryLocation.create({
        data: {
          variantId: variant.id,
          name: "Main Warehouse",
          quantity: 0,
          reserved: 0,
          lowStockThreshold: 5,
        },
      });

      return p;
    });

    // Audit log.
    await prisma.auditEvent.create({
      data: {
        actorId: session.id,
        action: "product.create",
        targetType: "Product",
        targetId: product.id,
        metadata: { name, slug, sku },
      },
    });

    return NextResponse.json({ ok: true, productId: product.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create product." }, { status: 400 });
  }
}
