import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { RiderReminderItem } from "@/lib/rider/dashboard-types";

export default function RiderReminders({ items }: { items: RiderReminderItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`flex items-start gap-3 rounded-2xl border p-4 shadow-sm ${
            item.urgent ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
          }`}
        >
          <AlertTriangle className={`h-5 w-5 shrink-0 ${item.urgent ? "text-red-600" : "text-amber-600"}`} />
          <p className={`text-sm font-medium ${item.urgent ? "text-red-900" : "text-amber-900"}`}>
            {item.message}
          </p>
        </Link>
      ))}
    </section>
  );
}
