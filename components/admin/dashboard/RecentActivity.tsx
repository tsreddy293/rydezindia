import type { ActivityItem } from "@/lib/admin/dashboard-types";

export default function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-secondary">Recent Activity</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No recent activity.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="pb-3 pr-4 font-semibold">Date</th>
                <th className="pb-3 pr-4 font-semibold">Time</th>
                <th className="pb-3 pr-4 font-semibold">User</th>
                <th className="pb-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => (
                <tr key={item.id} className="text-gray-700">
                  <td className="py-3 pr-4 whitespace-nowrap">{item.date}</td>
                  <td className="py-3 pr-4 whitespace-nowrap text-gray-500">{item.time}</td>
                  <td className="py-3 pr-4 font-medium">{item.user}</td>
                  <td className="py-3 text-gray-600">{item.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
