import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface VariantOption {
  id: string;
  sku: string;
  productName: string;
  variantName: string | null;
  available: number;
}

export default async function AdjustStockPage() {
  await requireAdmin();

  const locations = await prisma.inventoryLocation.findMany({
    include: {
      variant: {
        include: { product: true },
      },
    },
    orderBy: [{ name: "asc" }, { variant: { sku: "asc" } }],
  });

  const variants: VariantOption[] = locations.map((l) => ({
    id: l.variantId,
    sku: l.variant.sku,
    productName: l.variant.product.name,
    variantName: l.variant.name ?? null,
    available: l.quantity - l.reserved,
  }));

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <Link href="/admin/inventory" className="text-sm text-admin-accent hover:underline">
          ← Back to inventory
        </Link>
        <h1 className="text-2xl font-bold text-admin-ink">Adjust Stock</h1>
      </div>

      <div className="card">
        <form action="/api/admin/inventory/adjust" method="POST" className="space-y-4">
          <div>
            <label htmlFor="variantId" className="label">
              Product Variant
            </label>
            <select
              id="variantId"
              name="variantId"
              required
              className="input"
            >
              <option value="">Select a variant</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.productName}{v.variantName ? ` — ${v.variantName}` : ""} ({v.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="change" className="label">
              Change (units)
            </label>
            <input
              id="change"
              name="change"
              type="number"
              required
              className="input"
              placeholder="Positive = restock, negative = removal"
            />
            <p className="text-xs text-muted mt-1">
              Positive numbers add stock; negative numbers remove stock.
            </p>
          </div>

          <div>
            <label htmlFor="reason" className="label">Reason</label>
            <textarea
              id="reason"
              name="reason"
              required
              rows={3}
              className="input"
              placeholder="e.g. restock from supplier, damaged goods, inventory count correction"
            />
          </div>

          <button type="submit" className="btn-primary">
            Apply Adjustment
          </button>
        </form>
      </div>
    </div>
  );
}
