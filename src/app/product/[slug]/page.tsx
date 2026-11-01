import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: { slug: string };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug, isActive: true },
    include: {
      category: true,
      variants: {
        include: { prices: { take: 1 } },
        images: true,
      },
      images: true,
    },
  });

  if (!product) notFound();

  const variant = product.variants[0];
  const price = variant?.prices[0];
  const stock = variant?.inventory?.[0];
  const available = stock ? stock.quantity - stock.reserved : 0;

  return (
    <main className="storefront min-h-screen">
      <nav className="border-b border-gray-200 bg-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/catalog"
            className="text-sm text-muted hover:text-admin-accent"
          >
            ← Back to catalogue
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12">
          <div className="space-y-4">
            {product.images.length > 0 ? (
              product.images.map((img) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt={img.alt || product.name}
                  className="rounded-lg border border-gray-200 w-full h-64 object-cover"
                />
              ))
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-100 w-full h-64 flex items-center justify-center text-muted">
                No image
              </div>
            )}
          </div>

          <div className="space-y-6 lg:mt-4">
            {product.category && (
              <Link
                href={`/catalog?category=${product.category.slug}`}
                className="text-xs font-medium text-storefront-accent hover:underline"
              >
                {product.category.name}
              </Link>
            )}
            <h1 className="font-display font-bold text-2xl text-storefront-ink">
              {product.name}
            </h1>
            {product.description && (
              <p className="text-muted text-sm leading-relaxed">{product.description}</p>
            )}

            <div className="border-t border-gray-200 pt-6">
              {price ? (
                <p className="font-bold text-xl text-storefront-ink">
                  ${(price.amount / 100).toFixed(2)}
                </p>
              ) : (
                <p className="text-muted">Price not set</p>
              )}
              <p className="text-sm text-muted">
                {stock
                  ? available > 0
                    ? `In stock ({available} available)`
                    : "Out of stock"
                  : "Stock information unavailable"}
              </p>
            </div>

            {variant && price && available > 0 ? (
              <form
                action="/api/cart/add"
                method="POST"
                className="space-y-4"
              >
                <input type="hidden" name="variantId" value={variant.id} />
                <div className="flex items-center gap-4">
                  <label htmlFor="quantity" className="text-sm font-medium text-storefront-ink">
                    Qty
                  </label>
                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    max={Math.min(available, 10)}
                    defaultValue="1"
                    className="w-16 border border-gray-300 rounded-md px-2 py-1 text-center"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full btn-accent"
                >
                  Add to cart
                </button>
              </form>
            ) : (
              <p className="badge-danger">Not available for purchase</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
