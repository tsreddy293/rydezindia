"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  title: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function CheckoutExpandableSection({
  title,
  summary,
  children,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-secondary">{title}</p>
          {!open && summary ? (
            <p className="truncate text-xs text-gray-500">{summary}</p>
          ) : null}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
        )}
      </button>
      {open && <div className="border-t border-gray-100 px-3 pb-3 pt-2">{children}</div>}
    </div>
  );
}
