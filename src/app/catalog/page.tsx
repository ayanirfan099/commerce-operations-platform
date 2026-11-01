import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface CatalogProps {
  searchParams: { category?: string; q?: string; sort?: string };
}

export default async function CatalogPage({ searchParams }: CatalogProps) {
  const { category, q, sort } = searchParams;

  const where: any = { isActive: true };
  if (category) {
    where.category = { slug: category };
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  let orderBy: any = { createdAt: "desc" };
  if (sort === "price_asc") orderBy = { variants: { some: { prices: { some: {} } } } };
  if (sort === "price_desc") orderBy = { createdAt: "asc" };

  const [categories, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: {
          take: 1,
          include: { prices: { take: 1 } },
        },
      },
      orderBy,
    }),
  ]);

  const activeCategory = category ? categories.find((c) => c.slug === category) : null;
  if (category && !activeCategory) notFound();

  return (
    <main id="main-content" className="storefront min-h-screen">
      <header className="border-b border-gray-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display font-bold text-2xl text-storefront-ink">
            Catalogue
          </h1>
          {q && <p className="text-muted text-sm">Results for "{q}"</p>}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-1/4 flex-shrink-0">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-storefront-ink mb-3">Categories</h3>
                <ul className="space-y-2">
                  <li>
                    <Link
                      href={buildUrl({ category: undefined, q, sort })}
                      className={`text-sm ${!category ? "text-admin-accent font-medium" : "text-muted"}`}
                    >
                      All
                    </Link>
                  </li>
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <Link
                        href={buildUrl({ category: cat.slug, q, sort })}
                        className={`text-sm ${category === cat.slug ? "text-admin-accent font-medium" : "text-muted"}`}
                      >
                        {cat.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          <section className="lg:w-3/4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-muted text-sm">
                {products.length} product{products.length === 1 ? "" : "s"}
              </p>
              <select
                defaultValue={sort || ""}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
                onChange={(e) => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("sort", e.target.value);
                  window.location.href = url.toString();
                }}
              >
                <option value="">Featured</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.length === 0 && (
                <p className="text-muted text-sm">No products found.</p>
              )}
              {products.map((product) => {
                const variant = product.variants[0];
                const price = variant?.prices[0];
                return (
                  <article key={product.id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <Link href={`/product/${product.slug}`}>
                      <h3 className="font-semibold text-storefront-ink">{product.name}</h3>
                      {product.category && (
                        <p className="mt-1 text-xs text-muted">
                          {product.category.name}
                        </p>
                      )}
                      {price && (
                        <p className="mt-2 font-bold text-storefront-ink">
                          ${(price.amount / 100).toFixed(2)}
                        </p>
                      )}
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function buildUrl(params: { category?: string | undefined; q?: string | undefined; sort?: string | undefined }) {
  const url = new URL(window.location.href);
  if (params.category === undefined) url.searchParams.delete("category");
  else url.searchParams.set("category", params.category);
  if (params.q === undefined) url.searchParams.delete("q");
  else url.searchParams.set("q", params.q);
  if (params.sort === undefined) url.searchParams.delete("sort");
  else url.searchParams.set("sort", params.sort);
  return url.toString();
}
