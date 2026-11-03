import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const session = await getSession();

  const cookieStore = cookies();
  const guestSessionId = cookieStore.get("commerceops_guest_session")?.value;
  const cartKey = session
    ? { userId: session.id }
    : guestSessionId
      ? { sessionId: guestSessionId }
      : null;

  const cart = cartKey
    ? await prisma.cart.findUnique({
        where: cartKey,
        include: {
          items: {
            include: {
              variant: {
                include: { prices: { take: 1 }, product: true },
              },
            },
          },
        },
      })
    : null;

  if (!cart || cart.items.length === 0) {
    return (
      <main id="main-content" className="storefront min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display font-bold text-2xl text-storefront-ink">Your cart</h1>
          <p className="text-muted text-sm mt-2">Your cart is empty. Add a product from the catalogue.</p>
          <div className="mt-8">
            <Link href="/catalog" className="btn-secondary">
              Browse catalogue
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const total = cart.items.reduce(
    (sum, item) => sum + (item.variant.prices[0]?.amount || 0) * item.quantity,
    0,
  );

  return (
    <main id="main-content" className="storefront min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-display font-bold text-2xl text-storefront-ink">Your cart</h1>

        <div className="mt-8">
          <table className="w-full text-left border-collapse border border-gray-200">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-3 px-4 text-sm font-medium text-muted">Product</th>
                <th className="py-3 px-4 text-sm font-medium text-muted">Price</th>
                <th className="py-3 px-4 text-sm font-medium text-muted">Qty</th>
                <th className="py-3 px-4 text-sm font-medium text-muted">Total</th>
              </tr>
            </thead>
            <tbody>
              {cart.items.map((item) => {
                const price = item.variant.prices[0]?.amount || 0;
                return (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-4 px-4">
                      <div className="font-medium text-storefront-ink">
                        {item.variant.product.name}{item.variant.name ? ` — ${item.variant.name}` : ""}
                      </div>
                      <div className="text-xs text-muted">{item.variant.sku}</div>
                    </td>
                    <td className="py-4 px-4">${(price / 100).toFixed(2)}</td>
                    <td className="py-4 px-4">{item.quantity}</td>
                    <td className="py-4 px-4 font-medium">
                      ${((price * item.quantity) / 100).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex justify-end">
          <div className="text-right">
            <div className="text-sm text-muted">Total</div>
            <div className="font-bold text-xl text-storefront-ink">
              ${(total / 100).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Link href="/checkout" className="btn-primary">
            Proceed to checkout
          </Link>
        </div>
      </div>
    </main>
  );
}
