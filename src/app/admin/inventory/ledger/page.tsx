import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LedgerPage() {
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
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-admin-ink">Inventory Ledger</h1>
          <p className="text-muted text-sm">
            Append-only record of every stock change.
          </p>
        </div>
        <Link
          href="/admin/inventory/export"
          className="btn-secondary"
        >
          Export CSV
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left border-collapse border border-admin-border">
          <thead>
            <tr className="border-b border-admin-border bg-gray-50 sticky top-0">
              <th className="py-3 px-4 text-sm font-medium text-muted">Date</th>
              <th className="py-3 px-4 text-sm font-medium text-muted">SKU</th>
              <th className="py-3 px-4 text-sm font-medium text-muted">Product</th>
              <th className="py-3 px-4 text-sm font-medium text-muted">Variant</th>
              <th className="py-3 px-4 text-sm font-medium text-muted text-right">Change</th>
              <th className="py-3 px-4 text-sm font-medium text-muted">Reason</th>
              <th className="py-3 px-4 text-sm font-medium text-muted">Actor</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted">
                  No ledger entries.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-b border-admin-border">
                  <td className="py-3 px-4 text-sm text-muted font-mono">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono">
                    {e.location.variant.sku}
                  </td>
                  <td className="py-3 px-4 text-sm">{e.location.variant.product.name}</td>
                  <td className="py-3 px-4 text-sm text-muted">
                    {e.location.variant.name || "—"}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-mono">
                    <span className={`font-medium ${e.change > 0 ? "text-green-600" : e.change < 0 ? "text-red-600" : "text-muted"}`}>
                      {e.change > 0 ? "+" : ""}{e.change}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">{e.reason}</td>
                  <td className="py-3 px-4 text-sm text-muted">
                    {e.actor ? `${e.actor.name || e.actor.email}` : "system"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {entries.length === 100 && (
        <p className="text-sm text-muted">
          Showing the 100 most recent entries. Use Export CSV for the full history.
        </p>
      )}
    </div>
  );
}
