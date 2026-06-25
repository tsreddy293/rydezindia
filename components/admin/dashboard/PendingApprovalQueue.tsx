import Link from "next/link";
import type { PendingApprovalItem } from "@/lib/admin/dashboard-types";
import { PRIORITY_STYLES, priorityLabel } from "@/components/admin/dashboard/priority-styles";
import { formatDate } from "@/lib/utils";

export default function PendingApprovalQueue({ items }: { items: PendingApprovalItem[] }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-secondary">Pending Approval Queue</h2>
          <p className="text-sm text-gray-500">All items awaiting review</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="pb-3 pr-4 font-semibold">Type</th>
              <th className="pb-3 pr-4 font-semibold">Name</th>
              <th className="pb-3 pr-4 font-semibold">Submitted On</th>
              <th className="pb-3 pr-4 font-semibold">Status</th>
              <th className="pb-3 pr-4 font-semibold">Priority</th>
              <th className="pb-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No pending approvals — all caught up!
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const styles = PRIORITY_STYLES[item.priority];
                return (
                  <tr key={item.id}>
                    <td className="py-3 pr-4 font-medium">{item.type}</td>
                    <td className="py-3 pr-4">{item.name}</td>
                    <td className="py-3 pr-4 text-gray-500">
                      {item.submittedAt ? formatDate(item.submittedAt) : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles.badge}`}>
                        {priorityLabel(item.priority)}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={item.reviewHref}
                          className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary/90"
                        >
                          View Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
