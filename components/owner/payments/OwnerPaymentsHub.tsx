"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OwnerPageToolbar from "@/components/owner/shared/OwnerPageToolbar";
import OwnerTabs from "@/components/owner/shared/OwnerTabs";
import { downloadCsv } from "@/lib/owner/export-utils";
import { formatDate, formatINR } from "@/lib/utils";
import type { OwnerBookingRow } from "@/lib/owner/booking-utils";

type PayTab = "payments" | "refunds" | "settlements" | "invoices" | "transactions";

interface EarningRow {
  id: string;
  gross: number;
  platformFee: number;
  net: number;
  status: string;
  date: string;
}

interface Props {
  bookings: OwnerBookingRow[];
  earnings: EarningRow[];
}

const GST_RATE = 0.18;

export default function OwnerPaymentsHub({ bookings, earnings }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<PayTab>("payments");
  const [search, setSearch] = useState("");

  const tabs: Array<{ id: PayTab; label: string }> = [
    { id: "payments", label: "Payments" },
    { id: "refunds", label: "Refunds" },
    { id: "settlements", label: "Settlements" },
    { id: "invoices", label: "Invoices" },
    { id: "transactions", label: "Transactions" },
  ];

  const rows = useMemo(() => {
    if (tab === "refunds") {
      return bookings.filter((b) => b.bookingStatus.toLowerCase() === "cancelled");
    }
    if (tab === "settlements") {
      return earnings.filter((e) => e.status.toLowerCase() === "settled");
    }
    if (tab === "invoices" || tab === "transactions" || tab === "payments") {
      return bookings.filter((b) => {
        if (tab === "payments") return b.paymentStatus.toLowerCase() === "paid";
        return true;
      });
    }
    return bookings;
  }, [tab, bookings, earnings]);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    if (!q) return true;
    if ("bookingReference" in r) return (r as OwnerBookingRow).bookingReference.toLowerCase().includes(q);
    return true;
  });

  return (
    <div className="space-y-6">
      <OwnerTabs tabs={tabs} active={tab} onChange={setTab} />
      <OwnerPageToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search booking ID…"
        onRefresh={() => router.refresh()}
        onExport={() =>
          downloadCsv(`${tab}.csv`, ["ID", "Customer", "Amount", "Status"], filtered.map((b) => {
            const row = b as OwnerBookingRow;
            return [row.bookingReference, row.passengerName, String(row.amount), row.paymentStatus];
          }))
        }
      />

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Booking ID</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">GST</th>
              <th className="px-4 py-3">Net</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No records</td></tr>
            ) : (
              filtered.map((item) => {
                const b = item as OwnerBookingRow;
                const commission = Math.round(b.amount * 0.15);
                const gst = Math.round(commission * GST_RATE);
                const net = b.amount - commission - gst;
                return (
                  <tr key={b.id}>
                    <td className="px-4 py-3 font-medium">{b.bookingReference}</td>
                    <td className="px-4 py-3">{b.passengerName}</td>
                    <td className="px-4 py-3">{formatINR(b.amount)}</td>
                    <td className="px-4 py-3">{formatINR(commission)}</td>
                    <td className="px-4 py-3">{formatINR(gst)}</td>
                    <td className="px-4 py-3 font-semibold text-primary">{formatINR(net)}</td>
                    <td className="px-4 py-3 capitalize">{b.paymentStatus}</td>
                    <td className="px-4 py-3">
                      <Link href={`/booking/invoice/${b.id}`} className="text-primary hover:underline">PDF</Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
