import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { RiderDashboardData } from "@/lib/rider/dashboard-types";

export default function RewardPointsCard({ loyalty }: { loyalty: RiderDashboardData["loyalty"] }) {
  return (
    <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-violet-600">Reward Points</p>
          <p className="mt-1 text-3xl font-bold text-secondary">{loyalty.points.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-sm text-gray-600">
            {loyalty.tier} tier · {loyalty.discountPercent}% off
          </p>
          {loyalty.nextTier && loyalty.pointsToNext != null && (
            <p className="mt-2 text-xs text-gray-500">
              {loyalty.pointsToNext} points to {loyalty.nextTier}
            </p>
          )}
        </div>
        <Sparkles className="h-8 w-8 text-violet-400" />
      </div>
      <Link
        href="/dashboard/verification"
        className="mt-4 inline-flex text-sm font-semibold text-violet-700 hover:underline"
      >
        View loyalty benefits →
      </Link>
    </section>
  );
}
