import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ActionCenterItem } from "@/lib/admin/dashboard-types";
import { PRIORITY_STYLES, priorityLabel } from "@/components/admin/dashboard/priority-styles";

export default function ActionCenter({ items }: { items: ActionCenterItem[] }) {
  return (
    <section id="action-center" className="scroll-mt-24">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-secondary">Action Center</h2>
          <p className="text-sm text-gray-500">Tasks requiring immediate admin attention</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const styles = PRIORITY_STYLES[item.priority];
          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-5 shadow-sm ${styles.border} ${styles.bg}`}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${styles.badge}`}>
                  {priorityLabel(item.priority)}
                </span>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`} />
              </div>
              <p className={`text-3xl font-bold ${styles.text}`}>{item.count}</p>
              <p className="mt-1 text-sm font-medium text-gray-700">{item.label}</p>
              <Link
                href={item.href}
                className="mt-4 inline-flex items-center gap-1 rounded-xl bg-white/80 px-3 py-1.5 text-xs font-semibold text-secondary shadow-sm hover:bg-white"
              >
                Review
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
