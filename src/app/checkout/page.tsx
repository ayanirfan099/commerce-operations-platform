import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?callbackUrl=/checkout");
  }

  const cart = await prisma.cart.findUnique({
    where: { userId: session.id },
    include: {
      items: {
        include: {
          variant: {
            include: {
              prices: { take: 1, orderBy: { effectiveFrom: "desc" } },
              product: true,
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    redirect("/catalog");
  }

  // Server-authoritative pricing: recompute from the database.
  let total = 0;
  const lineItems = cart.items.map((item) => {
    const price = item.variant.prices[0]?.amount || 0;
    total += price * item.quantity;
    return {
      id: item.id,
      name: item.variant.product.name,
      sku: item.variant.sku,
      variantName: item.variant.name || "",
      unitPrice: price,
      quantity: item.quantity,
      lineTotal: price * item.quantity,
    };
  });

  const idempotencyKey = `checkout_${session.id}_${Date.now()}_${crypto.randomUUID()}`;

  return (
    <main className="storefront min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-display font-bold text-2xl text-storefront-ink">
          Checkout review
        </h1>
        <p className="text-muted text-sm mt-2">
          Prices are calculated on the server from current catalogue data.
        </p>

        <div className="mt-8 border border-gray-200 rounded-xl bg-white p-6">
          <h2 className="font-semibold text-storefront-ink mb-4">Order summary</h2>
          <div className="space-y-4">
            {lineItems.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div>
                  <div className="font-medium text-storefront-ink">
                    {item.name}{item.variantName ? ` — ${item.variantName}` : ""}
                  </div>
                  <div className="text-muted text-xs">{item.sku}</div>
                </div>
                <div className="text-right">
                  <div className="text-muted">
                    {item.quantity} × ${(item.unitPrice / 100).toFixed(2)}
                  </div>
                  <div className="font-medium">${(item.lineTotal / 100).toFixed(2)}</div>
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-gray-200 flex justify-between">
              <span className="font-medium text-storefront-ink">Total</span>
              <span className="font-bold text-xl">${(total / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-sm text-muted mb-4">
            Place your order using the fake payment provider (test mode). No real money is charged.
          </p>
          <form
            action="/api/checkout"
            method="POST"
            className="space-y-4"
          >
            <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
            <input type="hidden" name="provider" value="fake" />
            <button type="submit" className="btn-primary w-full md:w-auto">
              Place order (fake provider)
            </button>
          </form>
          <p className="mt-4 text-xs text-muted">
            This is a demonstration checkout. Orders are recorded against your account.
          </p>
        </div>

        <div className="mt-8">
          <Link href="/cart" className="text-sm text-storefront-accent hover:underline">
            ← Back to cart
          </Link>
        </div>
      </div>
    </main>
  );
}
