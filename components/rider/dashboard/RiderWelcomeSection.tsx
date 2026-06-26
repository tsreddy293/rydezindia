import { Star } from "lucide-react";
import type { RiderDashboardData } from "@/lib/rider/dashboard-types";

function formatMemberSince(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function RiderWelcomeSection({
  displayName,
  memberSince,
  verificationLabel,
  averageRating,
}: Pick<RiderDashboardData, "displayName" | "memberSince" | "verificationLabel" | "averageRating">) {
  const hasRealName = displayName.trim().toLowerCase() !== "rider";
  const isVerified = verificationLabel.toLowerCase().includes("verified");

  return (
    <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-white to-primary/5 p-6 shadow-sm">
      {hasRealName ? (
        <>
          <p className="text-sm font-medium text-primary">Welcome back,</p>
          <h1 className="text-2xl font-bold text-secondary md:text-3xl">{displayName} 👋</h1>
        </>
      ) : (
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Welcome back, Rider</h1>
      )}
      <p className="mt-1 text-sm text-gray-500">Ready for your next ride?</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isVerified ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"
          }`}
        >
          {verificationLabel}
        </span>
        <span className="text-xs text-gray-500">Member since {formatMemberSince(memberSince)}</span>
        {averageRating != null && averageRating > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
            <Star className="h-3.5 w-3.5 fill-amber-400" />
            {averageRating.toFixed(1)} rating
          </span>
        )}
      </div>
    </div>
  );
}
