import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await requireAdmin();

  const products = await prisma.product.findMany({
    include: {
      category: true,
      variants: { include: { prices: { take: 1 } } },
      images: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-admin-ink">Products</h1>
          <p className="text-muted text-sm">
            Manage the catalogue. All changes are audited.
          </p>
        </div>
        <Link href="/admin/products/new" className="btn-primary">
          Add Product
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left border-collapse border border-admin-border">
          <thead>
            <tr className="border-b border-admin-border bg-gray-50">
              <th className="py-3 px-4 text-sm font-medium text-muted">SKU</th>
              <th className="py-3 px-4 text-sm font-medium text-muted">Product</th>
              <th className="py-3 px-4 text-sm font-medium text-muted">Category</th>
              <th className="py-3 px-4 text-sm font-medium text-muted text-right">Price</th>
              <th className="py-3 px-4 text-sm font-medium text-muted text-right">Variants</th>
              <th className="py-3 px-4 text-sm font-medium text-muted">Status</th>
              <th className="py-3 px-4 text-sm font-medium text-muted text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted">
                  No products.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b border-admin-border">
                  <td className="py-3 px-4 text-sm font-mono">
                    {product.sku || "—"}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium">
                    {product.name}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted">
                    {product.category?.name || "Uncategorized"}
                  </td>
                  <td className="py-3 px-4 text-sm text-right">
                    {product.variants[0]?.prices[0] ? `$${(product.variants[0].prices[0].amount / 100).toFixed(2)}` : "—"}
                  </td>
                  <td className="py-3 px-4 text-sm text-right">{product.variants.length}</td>
                  <td className="py-3 px-4">
                    <span className={`badge ${product.isActive ? "badge-success" : "badge-danger"}`}>
                      {product.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-right">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="text-admin-accent hover:underline mr-3"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="font-semibold text-admin-ink mb-4">Categories</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span key={cat.id} className="badge">
              {cat.name}
              {cat.parentId && " (sub)"}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
