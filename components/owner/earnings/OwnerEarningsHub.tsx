"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardChart from "@/components/admin/dashboard/DashboardChart";
import OwnerPageToolbar from "@/components/owner/shared/OwnerPageToolbar";
import OwnerEmptyState from "@/components/owner/dashboard/ui/OwnerEmptyState";
import { downloadCsv } from "@/lib/owner/export-utils";
import { formatDate, formatINR } from "@/lib/utils";
import { IndianRupee } from "lucide-react";

interface EarningRow {
  id: string;
  earnedAt: string;
  gross: number;
  platformFee: number;
  net: number;
  status: string;
}

interface Props {
  today: number;
  week: number;
  month: number;
  year: number;
  lifetime: number;
  pending: number;
  withdrawable: number;
  commission: number;
  earnings: EarningRow[];
  revenueTrend: { label: string; value: number }[];
}

export default function OwnerEarningsHub(props: Props) {
  const router = useRouter();
  const vehicleRevenue = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of props.earnings) {
      const key = formatDate(e.earnedAt).slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + e.net);
    }
    return [...map.entries()].slice(-6).map(([label, value]) => ({ label, value }));
  }, [props.earnings]);

  const cards = [
    { label: "Today", value: props.today },
    { label: "This Week", value: props.week },
    { label: "This Month", value: props.month },
    { label: "This Year", value: props.year },
    { label: "Lifetime", value: props.lifetime },
    { label: "Pending", value: props.pending },
    { label: "Withdrawable", value: props.withdrawable },
    { label: "Platform Commission", value: props.commission },
  ];

  function handleExport() {
    downloadCsv(
      "earnings.csv",
      ["Date", "Gross", "Commission", "Net", "Status"],
      props.earnings.map((e) => [e.earnedAt, String(e.gross), String(e.platformFee), String(e.net), e.status])
    );
  }

  if (props.lifetime === 0) {
    return (
      <OwnerEmptyState icon={IndianRupee} title="No Earnings Yet" description="Complete trips to start earning." actionLabel="View Bookings" actionHref="/owner/bookings" />
    );
  }

  return (
    <div className="space-y-6">
      <OwnerPageToolbar onRefresh={() => router.refresh()} onExport={handleExport} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-gray-900">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="text-xl font-bold text-primary">{formatINR(c.value)}</p>
          </div>
        ))}
      </div>

      <Link href="/owner/wallet" className="inline-flex rounded-xl bg-gradient-to-r from-secondary to-primary px-5 py-2.5 text-sm font-semibold text-white">
        Withdraw to Wallet →
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Daily / Monthly Revenue</h3>
          <DashboardChart data={props.revenueTrend} valueFormatter={(v) => formatINR(v)} />
        </div>
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold">Trip-wise Revenue</h3>
          <DashboardChart data={vehicleRevenue} valueFormatter={(v) => formatINR(v)} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Gross</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Net</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {props.earnings.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3">{formatDate(e.earnedAt)}</td>
                <td className="px-4 py-3">{formatINR(e.gross)}</td>
                <td className="px-4 py-3">{formatINR(e.platformFee)}</td>
                <td className="px-4 py-3 font-semibold text-primary">{formatINR(e.net)}</td>
                <td className="px-4 py-3 capitalize">{e.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
