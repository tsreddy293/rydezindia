"use client";

import { useRouter } from "next/navigation";
import DashboardChart from "@/components/admin/dashboard/DashboardChart";
import OwnerPageToolbar from "@/components/owner/shared/OwnerPageToolbar";
import { downloadCsv, downloadJsonAsFile } from "@/lib/owner/export-utils";
import { formatINR } from "@/lib/utils";
import { useOwnerToast } from "@/components/owner/shared/useOwnerToast";

interface Props {
  revenueTrend: { label: string; value: number }[];
  bookingTrend: { label: string; value: number }[];
  topVehicle: { name: string; bookings: number } | null;
  cancellationRate: number;
  occupancy: number;
  monthlyRevenue: number;
  vehicleCount: number;
}

export default function OwnerReportsHub(props: Props) {
  const router = useRouter();
  const { show, Toast } = useOwnerToast();

  const reportData = {
    generated: new Date().toISOString(),
    ...props,
  };

  return (
    <div className="space-y-6">
      {Toast}
      <OwnerPageToolbar
        onRefresh={() => router.refresh()}
        onExport={() => downloadCsv("revenue-report.csv", ["Period", "Revenue"], props.revenueTrend.map((r) => [r.label, String(r.value)]))}
        exportLabel="Export CSV"
      >
        <button type="button" onClick={() => { downloadJsonAsFile("report.json", reportData); show("JSON exported", "success"); }} className="rounded-xl border px-3 py-2 text-sm font-medium">
          Export JSON
        </button>
        <button type="button" onClick={() => show("PDF export — use browser Print to PDF", "info")} className="rounded-xl border px-3 py-2 text-sm font-medium">
          Export PDF
        </button>
      </OwnerPageToolbar>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Monthly Revenue" value={formatINR(props.monthlyRevenue)} />
        <Stat label="Avg Occupancy" value={`${props.occupancy}%`} />
        <Stat label="Cancellation" value={`${props.cancellationRate}%`} accent="red" />
        <Stat label="Fleet Size" value={String(props.vehicleCount)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Revenue by Month" data={props.revenueTrend} inr />
        <ChartCard title="Bookings Trend" data={props.bookingTrend} />
      </div>

      {props.topVehicle && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-xs text-gray-500">Top Vehicle / Service</p>
            <p className="mt-1 text-xl font-bold capitalize">{props.topVehicle.name}</p>
            <p className="text-sm text-gray-500">{props.topVehicle.bookings} bookings</p>
          </div>
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-xs text-gray-500">Most Profitable</p>
            <p className="mt-1 text-xl font-bold text-emerald-600">{formatINR(props.monthlyRevenue)}</p>
            <p className="text-sm text-gray-500">This month</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent === "red" ? "text-red-600" : "text-secondary"}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, data, inr }: { title: string; data: { label: string; value: number }[]; inr?: boolean }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <DashboardChart data={data} valueFormatter={inr ? (v) => formatINR(v) : undefined} />
    </div>
  );
}
