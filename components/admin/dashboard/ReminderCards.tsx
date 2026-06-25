import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { ReminderItem } from "@/lib/admin/dashboard-types";

export default function ReminderCards({ items }: { items: ReminderItem[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-bold text-secondary">Admin Reminders</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex gap-3 rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md ${
              item.overdue
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <AlertTriangle
              className={`h-5 w-5 shrink-0 ${item.overdue ? "text-red-600" : "text-amber-600"}`}
            />
            <div>
              <p className={`text-sm font-medium ${item.overdue ? "text-red-900" : "text-amber-900"}`}>
                {item.message}
              </p>
              {item.overdue && (
                <p className="mt-1 text-xs font-semibold uppercase text-red-600">Overdue</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
