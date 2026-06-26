import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { RiderActionItem } from "@/lib/rider/dashboard-types";
import { RIDER_PRIORITY_STYLES } from "@/lib/rider/dashboard-types";

export default function RiderActionCenter({ items }: { items: RiderActionItem[] }) {
  return (
    <section id="action-center">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-secondary">Action Center</h2>
        <p className="text-sm text-gray-500">Things that need your attention</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {items.map((item) => {
          const styles = RIDER_PRIORITY_STYLES[item.priority];
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md ${styles.border} ${styles.bg}`}
            >
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${styles.badge}`}>
                {item.priority === "completed" ? "Clear" : item.priority}
              </span>
              <p className={`mt-3 text-2xl font-bold ${styles.text}`}>{item.count}</p>
              <p className="mt-1 text-sm font-medium text-gray-700">{item.label}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-secondary">
                Review <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
