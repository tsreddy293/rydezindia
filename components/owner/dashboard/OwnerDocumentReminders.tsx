import Link from "next/link";
import { AlertTriangle, FileWarning, Shield } from "lucide-react";
import type { OwnerDocumentReminder } from "@/lib/owner/dashboard-types";
import OwnerSection from "@/components/owner/dashboard/ui/OwnerSection";

const PRIORITY_STYLES = {
  urgent: "border-red-200 bg-red-50 text-red-900",
  high: "border-orange-200 bg-orange-50 text-orange-900",
  medium: "border-amber-200 bg-amber-50 text-amber-900",
};

export default function OwnerDocumentReminders({ reminders }: { reminders: OwnerDocumentReminder[] }) {
  if (reminders.length === 0) return null;

  return (
    <OwnerSection title="Document Reminders" description="Keep compliance up to date">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reminders.map((r) => (
          <Link
            key={r.id}
            href={r.href}
            className={`flex items-start gap-3 rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${PRIORITY_STYLES[r.priority]}`}
          >
            {r.id === "kyc" ? (
              <Shield className="mt-0.5 h-5 w-5 shrink-0" />
            ) : r.id.includes("insurance") || r.id === "insurance" ? (
              <FileWarning className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <div>
              <p className="font-semibold">{r.label}</p>
              <p className="mt-1 text-sm opacity-80">{r.description}</p>
              <span className="mt-2 inline-block text-xs font-bold uppercase tracking-wide">Take action →</span>
            </div>
          </Link>
        ))}
      </div>
    </OwnerSection>
  );
}
