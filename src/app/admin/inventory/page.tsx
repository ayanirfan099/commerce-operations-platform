import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface InventoryRow {
  variantId: string;
  sku: string;
  productName: string;
  variantName: string | null;
  locationName: string;
  quantity: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  isLowStock: boolean;
}

export default async function InventoryPage() {
  const locations = await prisma.inventoryLocation.findMany({
    include: {
      variant: {
        include: { product: true },
      },
    },
    orderBy: [{ name: "asc" }],
  });

  const rows: InventoryRow[] = locations.map((l) => {
    const available = l.quantity - l.reserved;
    const isLowStock = available <= l.lowStockThreshold;
    return {
      variantId: l.variantId,
      sku: l.variant.sku,
      productName: l.variant.product.name,
      variantName: l.variant.name ?? null,
      locationName: l.name,
      quantity: l.quantity,
      reserved: l.reserved,
      available,
      lowStockThreshold: l.lowStockThreshold,
      isLowStock,
    };
  });

  const lowStockCount = rows.filter((r) => r.isLowStock).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-admin-ink">Inventory</h1>
          <p className="text-muted text-sm">
            Stock levels, reservations, and low-stock alerts.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/inventory/adjust"
            className="btn-primary"
          >
            Adjust Stock
          </Link>
          <a
            href="/admin/inventory/export"
            className="btn-secondary"
          >
            Export CSV
          </a>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-admin-ink">Stock Levels</h2>
          <span className={`badge ${lowStockCount > 0 ? "badge-warning" : "badge-success"}`}>
            {lowStockCount} low stock{itemOrItems(lowStockCount)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-admin-border">
            <thead>
              <tr className="border-b border-admin-border bg-gray-50">
                <th className="py-3 px-4 text-sm font-medium text-muted">SKU</th>
                <th className="py-3 px-4 text-sm font-medium text-muted">Product</th>
                <th className="py-3 px-4 text-sm font-medium text-muted">Variant</th>
                <th className="py-3 px-4 text-sm font-medium text-muted text-right">On Hand</th>
                <th className="py-3 px-4 text-sm font-medium text-muted text-right">Reserved</th>
                <th className="py-3 px-4 text-sm font-medium text-muted text-right">Available</th>
                <th className="py-3 px-4 text-sm font-medium text-muted text-right">Threshold</th>
                <th className="py-3 px-4 text-sm font-medium text-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.variantId}
                  className={`border-b border-admin-border ${row.isLowStock ? "bg-amber-50" : ""}`}
                >
                  <td className="py-3 px-4 font-mono text-sm">{row.sku}</td>
                  <td className="py-3 px-4 text-sm">{row.productName}</td>
                  <td className="py-3 px-4 text-sm text-muted">
                    {row.variantName || "—"}
                  </td>
                  <td className="py-3 px-4 text-sm text-right">{row.quantity}</td>
                  <td className="py-3 px-4 text-sm text-right text-muted">
                    {row.reserved}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-medium">
                    {row.available}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-muted">
                    {row.lowStockThreshold}
                  </td>
                  <td className="py-3 px-4">
                    {row.isLowStock ? (
                      <span className="badge badge-warning">Low stock</span>
                    ) : (
                      <span className="badge badge-success">OK</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted">
                    No inventory records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function itemOrItems(n: number) {
  return n === 1 ? " item" : " items";
}
