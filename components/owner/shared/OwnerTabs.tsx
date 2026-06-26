"use client";

import { cn } from "@/lib/utils";

export default function OwnerTabs<T extends string>({
  tabs,
  active,
  onChange,
  counts,
}: {
  tabs: Array<{ id: T; label: string }>;
  active: T;
  onChange: (id: T) => void;
  counts?: Partial<Record<T, number>>;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-100 bg-gray-50/80 p-1 dark:border-gray-800 dark:bg-gray-900/50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            active === tab.id
              ? "bg-white text-secondary shadow-sm dark:bg-gray-800 dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          {tab.label}
          {counts?.[tab.id] != null && (
            <span className="ml-1.5 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold dark:bg-gray-700">
              {counts[tab.id]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
