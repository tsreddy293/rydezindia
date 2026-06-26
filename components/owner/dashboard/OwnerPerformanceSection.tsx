import { Award, Star, Target, ThumbsUp, TrendingDown, Zap } from "lucide-react";
import type { OwnerPerformanceMetrics } from "@/lib/owner/dashboard-types";
import OwnerSection from "@/components/owner/dashboard/ui/OwnerSection";

export default function OwnerPerformanceSection({
  performance,
  revenueGoal,
}: {
  performance: OwnerPerformanceMetrics;
  revenueGoal: { current: number; target: number };
}) {
  const progress = Math.min(100, Math.round((revenueGoal.current / Math.max(revenueGoal.target, 1)) * 100));

  const metrics = [
    { label: "Response Rate", value: `${performance.responseRate}%`, icon: Zap, color: "text-blue-600" },
    { label: "Acceptance Rate", value: `${performance.acceptanceRate}%`, icon: ThumbsUp, color: "text-emerald-600" },
    { label: "Cancellation Rate", value: `${performance.cancellationRate}%`, icon: TrendingDown, color: "text-red-600" },
    { label: "Average Rating", value: `${performance.averageRating.toFixed(1)} ★`, icon: Star, color: "text-amber-500" },
    { label: "Completed Trips", value: performance.completedTrips.toString(), icon: Award, color: "text-primary" },
    { label: "Total Reviews", value: performance.totalReviews.toString(), icon: Star, color: "text-gray-600" },
  ];

  return (
    <OwnerSection title="Owner Performance" description="Host quality metrics">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border-0 bg-gradient-to-br from-secondary via-secondary to-primary p-6 text-white shadow-lg lg:col-span-1">
          <p className="text-sm text-white/80">Performance Score</p>
          <p className="mt-2 text-5xl font-bold">{performance.performanceScore}</p>
          <p className="mt-3 text-sm text-white/70">Based on fleet health, trip completion, and verification.</p>
          {performance.performanceScore >= 80 && (
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
              <Award className="h-3.5 w-3.5" /> Top Performer
            </span>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className={`rounded-xl bg-gray-50 p-2.5 ${m.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{m.label}</p>
                  <p className="text-xl font-bold text-secondary">{m.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-secondary">Monthly Revenue Goal</h3>
          <span className="ml-auto text-sm font-bold text-primary">{progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </OwnerSection>
  );
}
