import { Award, Target, TrendingUp } from "lucide-react";
import { formatINR } from "@/lib/utils";

export default function OwnerPerformanceCard({
  score,
  revenueGoal,
}: {
  score: number;
  revenueGoal: { current: number; target: number };
}) {
  const progress = Math.min(100, Math.round((revenueGoal.current / Math.max(revenueGoal.target, 1)) * 100));

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border bg-gradient-to-br from-secondary to-primary p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-white/80" />
          <div>
            <p className="text-sm text-white/80">Performance Score</p>
            <p className="text-4xl font-bold">{score}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-white/70">Based on fleet approval, trip completion, and verification status.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
            <Award className="h-3.5 w-3.5" /> Trusted Host
          </span>
          {score >= 80 && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">Top Performer</span>
          )}
        </div>
      </div>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-secondary">Revenue Goal</h3>
        </div>
        <p className="text-sm text-gray-500">
          {formatINR(revenueGoal.current)} of {formatINR(revenueGoal.target)} this month
        </p>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-right text-sm font-semibold text-primary">{progress}%</p>
      </div>
    </section>
  );
}
