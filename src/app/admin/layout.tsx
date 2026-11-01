import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="min-h-screen bg-admin-surface text-admin-ink">
      <nav className="border-b border-admin-border bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-xl tracking-tight text-admin-ink">
                CommerceOps
              </span>
              <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-admin-accent">
                admin
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/admin"
                className="text-sm font-medium text-admin-ink hover:text-admin-accent"
              >
                Dashboard
              </a>
              <a
                href="/admin/products"
                className="text-sm font-medium text-admin-ink hover:text-admin-accent"
              >
                Products
              </a>
              <a
                href="/admin/inventory"
                className="text-sm font-medium text-admin-accent font-semibold"
              >
                Inventory
              </a>
              <a
                href="/admin/audit"
                className="text-sm font-medium text-admin-ink hover:text-admin-accent"
              >
                Audit Log
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
