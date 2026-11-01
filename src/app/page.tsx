import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const categories = await prisma.category.findMany({
    where: { products: { some: { isActive: true } } },
    include: {
      products: {
        where: { isActive: true },
        take: 3,
        include: { variants: { take: 1, include: { prices: { take: 1 } } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <main id="main-content" className="storefront min-h-screen">
      <header className="border-b border-gray-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display font-bold text-3xl text-storefront-ink tracking-tight">
            CommerceOps
          </h1>
          <p className="mt-2 text-muted text-sm">
            Fictional e-commerce storefront with server-authoritative checkout, inventory ledger,
            and operations dashboard.
          </p>
        </div>
      </header>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display font-bold text-2xl text-storefront-ink mb-6">
            Browse by category
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/catalog?category=${category.slug}`}
                className="block"
              >
                <div className="rounded-xl border border-gray-200 bg-white p-6 hover:border-amber-200 transition">
                  <h3 className="font-semibold text-storefront-ink">{category.name}</h3>
                  <p className="mt-1 text-muted text-sm">
                    {category.products.length} product{category.products.length === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-2xl text-storefront-ink">Featured</h2>
            <Link
              href="/catalog"
              className="text-sm font-medium text-storefront-accent hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.flatMap((cat) =>
              cat.products.map((product) => {
                const variant = product.variants[0];
                const price = variant?.prices[0];
                return (
                  <article
                    key={product.id}
                    className="group rounded-xl border border-gray-200 bg-white p-4 hover:border-amber-300 transition"
                  >
                    <Link href={`/product/${product.slug}`}>
                      <h3 className="font-semibold text-storefront-ink">{product.name}</h3>
                      {product.description && (
                        <p className="mt-1 text-muted text-sm line-clamp-2">
                          {product.description}
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
              })
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
