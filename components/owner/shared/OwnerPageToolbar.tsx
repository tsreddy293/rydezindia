"use client";

import { Download, RefreshCw, Search } from "lucide-react";

interface Props {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  exportLabel?: string;
  children?: React.ReactNode;
}

export default function OwnerPageToolbar({
  searchPlaceholder = "Search…",
  searchValue = "",
  onSearchChange,
  onRefresh,
  onExport,
  exportLabel = "Export CSV",
  children,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:flex-wrap sm:items-center">
      {onSearchChange && (
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
      )}
      {children}
      <div className="flex gap-2 sm:ml-auto">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        )}
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Download className="h-4 w-4" /> {exportLabel}
          </button>
        )}
      </div>
    </div>
  );
}
