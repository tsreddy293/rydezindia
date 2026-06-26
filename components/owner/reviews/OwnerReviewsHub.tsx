"use client";

import { Star } from "lucide-react";
import { useOwnerToast } from "@/components/owner/shared/useOwnerToast";

const DISTRIBUTION = [
  { stars: 5, pct: 72 },
  { stars: 4, pct: 18 },
  { stars: 3, pct: 6 },
  { stars: 2, pct: 3 },
  { stars: 1, pct: 1 },
];

export default function OwnerReviewsHub() {
  const { show, Toast } = useOwnerToast();
  const avg = 4.8;
  const total = 0;

  return (
    <div className="space-y-6">
      {Toast}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border bg-gradient-to-br from-amber-50 to-white p-8 text-center shadow-sm lg:col-span-1">
          <p className="text-5xl font-bold text-secondary">{avg.toFixed(1)}</p>
          <div className="mt-2 flex justify-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-5 w-5 ${i < Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-500">{total} reviews · Reviews appear after trips</p>
        </div>
        <div className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-4 font-semibold">Rating Distribution</h3>
          <div className="space-y-2">
            {DISTRIBUTION.map((d) => (
              <div key={d.stars} className="flex items-center gap-3 text-sm">
                <span className="w-8">{d.stars}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${d.pct}%` }} />
                </div>
                <span className="w-10 text-right text-gray-500">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed bg-gray-50 py-16 text-center">
        <Star className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-3 font-medium text-gray-600">No customer reviews yet</p>
        <p className="mt-1 text-sm text-gray-400">Reviews will appear here with reply options after completed trips.</p>
        <button type="button" onClick={() => show("Reply feature available when reviews are received", "info")} className="mt-4 rounded-xl border px-4 py-2 text-sm font-medium text-gray-600">
          Preview Reply UI
        </button>
      </div>
    </div>
  );
}
