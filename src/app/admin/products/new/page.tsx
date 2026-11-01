import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <Link href="/admin/products" className="text-sm text-admin-accent hover:underline">
          ← Back to products
        </Link>
        <h1 className="text-2xl font-bold text-admin-ink">Add Product</h1>
      </div>

      <div className="card">
        <form action="/api/admin/products" method="POST" className="space-y-4">
          <div>
            <label htmlFor="name" className="label">
              Product Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="input"
              placeholder="e.g. Ceramic Mug"
            />
          </div>

          <div>
            <label htmlFor="slug" className="label">
              URL Slug
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              required
              className="input"
              placeholder="e.g. ceramic-mug"
            />
          </div>

          <div>
            <label htmlFor="description" className="label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="input"
              placeholder="Fictional product description."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sku" className="label">
                SKU
              </label>
              <input
                id="sku"
                name="sku"
                type="text"
                required
                className="input"
                placeholder="e.g. MUG-001"
              />
            </div>

            <div>
              <label htmlFor="categoryId" className="label">
                Category
              </label>
              <select id="categoryId" name="categoryId" className="input">
                <option value="">Uncategorized</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="price" className="label">
              Price (USD)
            </label>
            <input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              required
              className="input"
              placeholder="0.00"
            />
            <p className="text-xs text-muted mt-1">
              Price is stored in cents in the database.
            </p>
          </div>

          <button type="submit" className="btn-primary">
            Create Product
          </button>
        </form>
      </div>
    </div>
  );
}
