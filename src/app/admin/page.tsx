import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [productCount, lowStockCount, orderCount, recentOrders] =
    await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.inventoryLocation.aggregate({
        _sum: {},
        where: {},
      }).then(() =>
        prisma.inventoryLocation.findMany({
          where: {},
          include: { variant: true },
        })
      ).then((locations) =>
        locations.filter((l) => l.quantity - l.reserved <= l.lowStockThreshold)
          .length
      ),
      prisma.order.count(),
      prisma.order.findMany({
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-admin-ink">Admin Dashboard</h1>
        <p className="text-muted text-sm">
          Manage catalogue, inventory, and orders.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm text-muted">Active Products</div>
          <div className="text-2xl font-bold">{productCount}</div>
        </div>
        <div className="card border-l-4 border-amber-500">
          <div className="text-sm text-muted">Low Stock Items</div>
          <div className="text-2xl font-bold text-amber-700">
            {lowStockCount}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-muted">Total Orders</div>
          <div className="text-2xl font-bold">{orderCount}</div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-admin-ink mb-4">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-admin-border text-sm">
                <th className="py-3 px-4 text-muted font-medium">Order</th>
                <th className="py-3 px-4 text-muted font-medium">Status</th>
                <th className="py-3 px-4 text-muted font-medium">Total</th>
                <th className="py-3 px-4 text-muted font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-admin-border">
                    <td className="py-3 px-4 font-medium">
                      {order.orderNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="badge">{order.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      ${(order.total / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
