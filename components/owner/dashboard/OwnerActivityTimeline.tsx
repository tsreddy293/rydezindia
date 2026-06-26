import { formatDate } from "@/lib/utils";
import OwnerSection from "@/components/owner/dashboard/ui/OwnerSection";

export default function OwnerActivityTimeline({
  items,
}: {
  items: Array<{ id: string; date: string; action: string }>;
}) {
  return (
    <OwnerSection title="Recent Activity" description="Latest platform events">
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-500">
          No recent activity.
        </p>
      ) : (
        <ol className="relative space-y-0 overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {items.map((item, i) => (
            <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
              {i < items.length - 1 && (
                <span className="absolute left-[7px] top-4 h-full w-px bg-gray-200" />
              )}
              <span className="relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white bg-primary shadow ring-2 ring-primary/20" />
              <div>
                <p className="text-sm font-medium text-secondary">{item.action}</p>
                <p className="text-xs text-gray-400">{formatDate(item.date)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </OwnerSection>
  );
}
