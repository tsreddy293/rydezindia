"use client";

const RANGES = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7days", label: "Last 7 Days" },
  { id: "month", label: "This Month" },
  { id: "year", label: "This Year" },
] as const;

export type DateRangeId = (typeof RANGES)[number]["id"];

export default function QuickFilters({
  value,
  onChange,
}: {
  value: DateRangeId;
  onChange: (range: DateRangeId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {RANGES.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(r.id)}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            value === r.id
              ? "bg-primary text-white shadow-sm"
              : "border border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
