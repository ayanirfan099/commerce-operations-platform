import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?callbackUrl=/account");
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.id },
    include: { items: true, payments: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main id="main-content" className="storefront min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-display font-bold text-2xl text-storefront-ink">Account</h1>
        <p className="text-muted text-sm mt-2">
          Welcome, {session.name || session.email}.
        </p>

        <div className="mt-8">
          <h2 className="font-semibold text-storefront-ink mb-4">Order history</h2>
          {orders.length === 0 ? (
            <p className="text-muted text-sm">No orders yet.</p>
          ) : (
            <table className="w-full text-left border-collapse border border-gray-200">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="py-3 px-4 text-sm font-medium text-muted">Order</th>
                  <th className="py-3 px-4 text-sm font-medium text-muted">Status</th>
                  <th className="py-3 px-4 text-sm font-medium text-muted">Total</th>
                  <th className="py-3 px-4 text-sm font-medium text-muted">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100">
                    <td className="py-4 px-4 font-medium text-storefront-ink">
                      {order.orderNumber}
                    </td>
                    <td className="py-4 px-4 text-sm">
                      <span className="badge">{order.status}</span>
                    </td>
                    <td className="py-4 px-4">${(order.total / 100).toFixed(2)}</td>
                    <td className="py-4 px-4 text-sm text-muted">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
