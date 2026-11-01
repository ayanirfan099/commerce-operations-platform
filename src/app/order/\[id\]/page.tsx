import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface OrderPageProps {
  params: { id: string };
}

export default async function OrderPage({ params }: OrderPageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/login?callbackUrl=/order/" + params.id);
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true, payments: true },
  });

  if (!order) {
    redirect("/account");
  }

  // Customers can only view their own orders; admins can view any.
  if (session.role !== "ADMIN" && order.userId !== session.id) {
    redirect("/account");
  }

  return (
    <main id="main-content" className="storefront min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-display font-bold text-2xl text-storefront-ink">
          Order confirmation
        </h1>

        <div className="mt-8 border border-gray-200 rounded-xl bg-white p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="font-semibold text-storefront-ink">{order.orderNumber}</h2>
              <p className="text-muted text-sm">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
            <span className="badge">{order.status}</span>
          </div>

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
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-4 px-4">
                    <div className="font-medium text-storefront-ink">{item.name}</div>
                    <div className="text-xs text-muted">{item.sku}</div>
                  </td>
                  <td className="py-4 px-4">${(item.unitPrice / 100).toFixed(2)}</td>
                  <td className="py-4 px-4">{item.quantity}</td>
                  <td className="py-4 px-4 font-medium">
                    ${((item.unitPrice * item.quantity) / 100).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 border-t border-gray-200 pt-4 flex justify-between">
            <span className="font-medium text-storefront-ink">Total</span>
            <span className="font-bold text-xl">${(order.total / 100).toFixed(2)}</span>
          </div>

          <div className="mt-4">
            <div className="text-sm text-muted">Payment</div>
            {order.payments.map((p) => (
              <div key={p.id} className="text-sm text-muted">
                {p.provider}: {p.status}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <Link href="/account" className="btn-secondary">
            View all orders
          </Link>
          <Link href="/catalog" className="ml-2 text-sm text-storefront-accent hover:underline">
            Continue shopping
          </Link>
        </div>
      </div>
    </main>
  );
}
