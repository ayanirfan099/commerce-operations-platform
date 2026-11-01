import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DiscountsPage() {
  await requireAdmin();

  const discounts = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-admin-ink">Discount Codes</h1>
          <p className="text-muted text-sm">
            Manage promotion codes. All codes are validated server-side at checkout.
          </p>
        </div>
        <Link href="/admin/discounts/new" className="btn-primary">
          Add Discount
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left border-collapse border border-admin-border">
          <thead>
            <tr className="border-b border-admin-border bg-gray-50">
              <th className="py-3 px-4 text-sm font-medium text-muted">Code</th>
              <th className="py-3 px-4 text-sm font-medium text-muted">Type</th>
              <th className="py-3 px-4 text-sm font-medium text-muted text-right">
                Value
              </th>
              <th className="py-3 px-4 text-sm font-medium text-muted text-right">
                Min Subtotal
              </th>
              <th className="py-3 px-4 text-sm font-medium text-muted">Usage</th>
              <th className="py-3 px-4 text-sm font-medium text-muted">Validity</th>
              <th className="py-3 px-4 text-sm font-medium text-muted">Status</th>
              <th className="py-3 px-4 text-sm font-medium text-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {discounts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted">
                  No discount codes.
                </td>
              </tr>
            ) : (
              discounts.map((d) => {
                const isValid =
                  d.isActive &&
                  now >= d.validFrom &&
                  now <= d.validTo &&
                  (d.usageLimit === null || d.usageCount < d.usageLimit);
                const valueText =
                  d.type === "PERCENTAGE"
                    ? `${d.value}%`
                    : `$${(d.value / 100).toFixed(2)}`;
                return (
                  <tr key={d.id} className="border-b border-admin-border">
                    <td className="py-3 px-4 text-sm font-mono font-medium">
                      {d.code}
                    </td>
                    <td className="py-3 px-4 text-sm">{d.type}</td>
                    <td className="py-3 px-4 text-sm text-right">{valueText}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      $${(d.minSubtotal / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {d.usageCount}{" "}
                      {d.usageLimit !== null
                        ? `/ ${d.usageLimit}`
                        : "/ \u221e"}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted">
                      {new Date(d.validFrom).toLocaleDateString()}{" "}
                      —{new Date(d.validTo).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`badge ${
                          isValid ? "badge-success" : "badge-danger"
                        }`}
                      >
                        {isValid ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right"></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
