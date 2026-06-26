"use client";

import Link from "next/link";
import {
  AlertCircle,
  Bell,
  Calendar,
  Car,
  CheckCircle,
  CreditCard,
  FileText,
  FileWarning,
  Shield,
  Truck,
} from "lucide-react";
import type { OwnerActionIcon, OwnerActionItem } from "@/lib/owner/dashboard-types";
import { OWNER_PRIORITY_STYLES } from "@/lib/owner/dashboard-types";
import OwnerEmptyState from "@/components/owner/dashboard/ui/OwnerEmptyState";
import OwnerSection from "@/components/owner/dashboard/ui/OwnerSection";

const ICON_MAP: Record<OwnerActionIcon, React.ComponentType<{ className?: string }>> = {
  car: Car,
  shield: Shield,
  calendar: Calendar,
  "credit-card": CreditCard,
  truck: Truck,
  "file-warning": FileWarning,
  bell: Bell,
  "file-text": FileText,
  "alert-circle": AlertCircle,
  "check-circle": CheckCircle,
};

export default function OwnerActionCenter({ items }: { items: OwnerActionItem[] }) {
  return (
    <OwnerSection
      id="action-center"
      title="Action Center"
      description="Items requiring your attention"
    >
      {items.length === 0 ? (
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-8 text-center">
          <CheckCircle className="mx-auto h-10 w-10 text-emerald-500" />
          <p className="mt-3 font-semibold text-emerald-900">All caught up!</p>
          <p className="mt-1 text-sm text-emerald-700">No pending actions at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const s = OWNER_PRIORITY_STYLES[item.priority];
            const Icon = ICON_MAP[item.icon];
            return (
              <article
                key={item.id}
                className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${s.border} ${s.bg}`}
              >
                <span className={`absolute left-0 top-0 h-full w-1 ${s.dot}`} />
                <div className="flex items-start gap-4">
                  <div className={`rounded-xl bg-white/80 p-3 shadow-sm ${s.text}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${s.badge}`}>
                        {item.priority}
                      </span>
                      {item.count > 1 && (
                        <span className="text-xs font-bold text-gray-500">×{item.count}</span>
                      )}
                    </div>
                    <h3 className={`mt-2 font-semibold ${s.text}`}>{item.label}</h3>
                    <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                    <Link
                      href={item.href}
                      className="mt-4 inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-secondary shadow-sm transition hover:bg-secondary hover:text-white"
                    >
                      {item.actionLabel}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </OwnerSection>
  );
}
