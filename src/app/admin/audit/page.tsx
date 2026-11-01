import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireAdmin();

  const events = await prisma.auditEvent.findMany({
    include: {
      actor: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-admin-ink">Audit Log</h1>
        <p className="text-muted text-sm">
          Record of admin actions and state transitions.
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left border-collapse border border-admin-border">
          <thead>
            <tr className="border-b border-admin-border bg-gray-50 sticky top-0">
              <th className="py-3 px-4 text-sm font-medium text-muted">Date</th>
              <th className="py-3 px-4 text-sm font-medium text-muted">Actor</th>
              <th className="py-3 px-4 text-sm font-medium text-muted">Action</th>
              <th className="py-3 px-4 text-sm font-medium text-muted">Target</th>
              <th className="py-3 px-4 text-sm font-medium text-muted">Details</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted">
                  No audit events.
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.id} className="border-b border-admin-border">
                  <td className="py-3 px-4 text-sm text-muted font-mono">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {e.actor ? `${e.actor.name || e.actor.email}` : "system"}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono">
                    {e.action}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted">
                    {e.targetType && e.targetId ? `${e.targetType} (${e.targetId})` : "—"}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted">
                    {e.metadata ? JSON.stringify(e.metadata) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
