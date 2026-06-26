"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  FileText,
  MessageCircle,
  Phone,
  Play,
  Square,
  X,
} from "lucide-react";
import OwnerPageToolbar from "@/components/owner/shared/OwnerPageToolbar";
import OwnerTabs from "@/components/owner/shared/OwnerTabs";
import OwnerEmptyState from "@/components/owner/dashboard/ui/OwnerEmptyState";
import ReturnJourneyPromptModal from "@/components/owner/bookings/ReturnJourneyPromptModal";
import { useOwnerToast } from "@/components/owner/shared/useOwnerToast";
import {
  type BookingTab,
  type OwnerBookingRow,
  filterBookingsByTab,
  tripStatusLabel,
} from "@/lib/owner/booking-utils";
import { downloadCsv } from "@/lib/owner/export-utils";
import { OWNER_STATUS_STYLES, resolveBookingStatusKind } from "@/lib/owner/owner-status-styles";
import { formatDate, formatINR } from "@/lib/utils";
import { Calendar } from "lucide-react";

const TABS: Array<{ id: BookingTab; label: string }> = [
  { id: "upcoming", label: "Upcoming" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "refunds", label: "Refunds" },
];

interface Props {
  bookings: OwnerBookingRow[];
  approvedVehicles: Array<{ id: string; vehicle_name: string; vehicle_type: string }>;
}

export default function OwnerBookingsHub({ bookings, approvedVehicles }: Props) {
  const router = useRouter();
  const { show, Toast } = useOwnerToast();
  const [tab, setTab] = useState<BookingTab>("upcoming");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [returnJourneyBooking, setReturnJourneyBooking] = useState<OwnerBookingRow | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const tabCounts = useMemo(() => {
    const counts = {} as Partial<Record<BookingTab, number>>;
    for (const t of TABS) counts[t.id] = filterBookingsByTab(bookings, t.id).length;
    return counts;
  }, [bookings]);

  const filtered = useMemo(() => {
    let list = filterBookingsByTab(bookings, tab);
    const q = search.toLowerCase();
    if (q) {
      list = list.filter(
        (b) =>
          b.bookingReference.toLowerCase().includes(q) ||
          b.passengerName.toLowerCase().includes(q) ||
          b.bookingType.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((b) => b.bookingStatus.toLowerCase() === statusFilter);
    }
    return list;
  }, [bookings, tab, search, statusFilter]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  function handleCompleteTrip(b: OwnerBookingRow) {
    setReturnJourneyBooking(b);
    show("Trip marked complete — create return journey?", "success");
  }

  function handleExport() {
    downloadCsv(
      `bookings-${tab}.csv`,
      ["ID", "Customer", "Type", "Pickup", "Drop", "Amount", "Payment", "Status"],
      filtered.map((b) => [
        b.bookingReference,
        b.passengerName,
        b.bookingType,
        b.pickupLocation ?? "",
        b.dropLocation ?? "",
        String(b.amount),
        b.paymentStatus,
        b.bookingStatus,
      ])
    );
  }

  return (
    <div className="space-y-6">
      {Toast}
      <OwnerTabs tabs={TABS} active={tab} onChange={(t) => { setTab(t); setPage(1); }} counts={tabCounts} />

      <OwnerPageToolbar
        searchPlaceholder="Search booking ID, customer…"
        searchValue={search}
        onSearchChange={setSearch}
        onRefresh={() => router.refresh()}
        onExport={handleExport}
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </OwnerPageToolbar>

      {filtered.length === 0 ? (
        <OwnerEmptyState
          icon={Calendar}
          title="No Bookings"
          description={`No ${tab} bookings match your filters.`}
          actionLabel="Refresh"
          actionHref="/owner/bookings"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3">Booking ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Vehicle / Service</th>
                  <th className="px-4 py-3">Pickup</th>
                  <th className="px-4 py-3">Return</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Trip</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginated.map((b) => {
                  const kind = resolveBookingStatusKind(b.bookingStatus, b.paymentStatus);
                  return (
                    <tr key={b.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium">{b.bookingReference}</td>
                      <td className="px-4 py-3">{b.passengerName}</td>
                      <td className="px-4 py-3 capitalize">{b.bookingType}</td>
                      <td className="max-w-[120px] truncate px-4 py-3 text-gray-600">{b.pickupLocation ?? "—"}</td>
                      <td className="max-w-[120px] truncate px-4 py-3 text-gray-600">{b.dropLocation ?? "—"}</td>
                      <td className="px-4 py-3 font-bold text-primary">{formatINR(b.amount)}</td>
                      <td className="px-4 py-3 capitalize">{b.paymentStatus}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${OWNER_STATUS_STYLES[kind]}`}>
                          {b.bookingStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{tripStatusLabel(b.bookingStatus)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition hover:bg-primary hover:text-white" title="View"><Eye className="h-3 w-3" /></button>
                          <a href="tel:" className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition hover:bg-primary hover:text-white" title="Call"><Phone className="h-3 w-3" /></a>
                          <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition hover:bg-primary hover:text-white" title="WhatsApp"><MessageCircle className="h-3 w-3" /></a>
                          {tab === "active" && (
                            <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-emerald-600 transition hover:bg-emerald-600 hover:text-white" title="Start" onClick={() => show("Trip started", "info")}>
                              <Play className="h-3 w-3" />
                            </button>
                          )}
                          {(tab === "active" || tab === "upcoming") && (
                            <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-blue-600 transition hover:bg-blue-600 hover:text-white" title="Complete" onClick={() => handleCompleteTrip(b)}>
                              <Square className="h-3 w-3" />
                            </button>
                          )}
                          <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-red-500 transition hover:bg-red-600 hover:text-white" title="Cancel" onClick={() => show("Contact support to cancel", "info")}>
                            <X className="h-3 w-3" />
                          </button>
                          <Link href={`/booking/invoice/${b.id}`} className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition hover:bg-primary hover:text-white" title="Invoice"><FileText className="h-3 w-3" /></Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button key={i} type="button" onClick={() => setPage(i + 1)} className={`h-9 w-9 rounded-lg text-sm ${page === i + 1 ? "bg-secondary text-white" : "bg-gray-100"}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {returnJourneyBooking && (
        <ReturnJourneyPromptModal
          booking={returnJourneyBooking}
          vehicles={approvedVehicles}
          onClose={() => setReturnJourneyBooking(null)}
        />
      )}
    </div>
  );
}
