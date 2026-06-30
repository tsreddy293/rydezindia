"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  FileText,
  IndianRupee,
  MessageCircle,
  Phone,
  Key,
  Play,
  RotateCcw,
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
  getOwnerSelfDrivePaymentSummary,
  ownerBookingStatusLabel,
  ownerPaymentStatusLabel,
} from "@/lib/owner/booking-utils";
import { downloadCsv } from "@/lib/owner/export-utils";
import { OWNER_STATUS_STYLES, resolveBookingStatusKind } from "@/lib/owner/owner-status-styles";
import { formatDate, formatINR } from "@/lib/utils";
import { Calendar } from "lucide-react";
import {
  ownerApproveBooking,
  ownerCompleteTrip,
  ownerRejectBooking,
  ownerStartTrip,
} from "@/server/actions/ownerBookings";
import {
  ownerHandoverVehicle,
  ownerStartSelfDriveTrip,
  ownerCompleteSelfDriveTrip,
  ownerCollectSelfDriveBalance,
  processSelfDriveDepositRefund,
} from "@/server/actions/selfDrivePayment";

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

  async function runOwnerAction(action: () => Promise<{ success: boolean; error?: string }>, successMsg: string) {
    const result = await action();
    if (result.success) {
      show(successMsg, "success");
      router.refresh();
    } else {
      show(result.error ?? "Action failed", "error");
    }
  }

  function handleStartTrip(b: OwnerBookingRow) {
    void runOwnerAction(() => ownerStartTrip(b.id), "Trip started");
  }

  function handleCompleteTripAction(b: OwnerBookingRow) {
    void runOwnerAction(() => ownerCompleteTrip(b.id), "Trip marked complete");
    setReturnJourneyBooking(b);
  }

  function handleApprove(b: OwnerBookingRow) {
    void runOwnerAction(() => ownerApproveBooking(b.id), "Booking approved");
  }

  function handleReject(b: OwnerBookingRow) {
    void runOwnerAction(() => ownerRejectBooking(b.id), "Booking rejected");
  }

  function handleSelfDriveRefund(b: OwnerBookingRow) {
    const damage = window.prompt("Enter damage charges (₹) or leave empty for full refund:", "0");
    if (damage === null) return;
    const damageCharges = Math.max(0, Math.round(Number(damage) || 0));
    void runOwnerAction(
      () => processSelfDriveDepositRefund({ bookingId: b.id, damageCharges, approvedBy: "owner" }),
      "Deposit refund processed"
    );
  }

  function handleSelfDriveStart(b: OwnerBookingRow) {
    void runOwnerAction(() => ownerStartSelfDriveTrip(b.id), "Trip started");
  }

  function handleSelfDriveComplete(b: OwnerBookingRow) {
    void runOwnerAction(() => ownerCompleteSelfDriveTrip(b.id), "Trip marked complete");
  }

  function handleHandover(b: OwnerBookingRow) {
    void runOwnerAction(() => ownerHandoverVehicle(b.id), "Vehicle handed over");
  }

  function handleCollectBalance(b: OwnerBookingRow) {
    void runOwnerAction(
      () => ownerCollectSelfDriveBalance(b.id),
      "Remaining balance collected"
    );
  }

  function isSelfDrive(b: OwnerBookingRow) {
    return b.bookingType.toLowerCase() === "self_drive";
  }

  function canStartTrip(b: OwnerBookingRow) {
    if (!isSelfDrive(b)) {
      return ["confirmed", "owner_confirmed", "pending"].includes(b.bookingStatus.toLowerCase());
    }
    const summary = getOwnerSelfDrivePaymentSummary(b);
    return (
      summary?.fullyPaid &&
      b.bookingStatus.toLowerCase() === "confirmed" &&
      b.selfDriveSnapshot?.operationalStage === "handed_over"
    );
  }

  function canCollectBalance(b: OwnerBookingRow) {
    if (!isSelfDrive(b)) return false;
    const summary = getOwnerSelfDrivePaymentSummary(b);
    return (
      b.bookingStatus.toLowerCase() === "confirmed" &&
      b.paymentStatus.toLowerCase() === "partial" &&
      Boolean(summary && summary.balancePending > 0 && summary.advanceReceived > 0)
    );
  }

  function canHandover(b: OwnerBookingRow) {
    if (!isSelfDrive(b)) return false;
    const summary = getOwnerSelfDrivePaymentSummary(b);
    return (
      summary?.fullyPaid &&
      b.paymentStatus.toLowerCase() === "paid" &&
      b.bookingStatus.toLowerCase() === "confirmed" &&
      (b.selfDriveSnapshot?.operationalStage ?? "none") === "none"
    );
  }

  function canProcessRefund(b: OwnerBookingRow) {
    return (
      isSelfDrive(b) &&
      b.selfDriveSnapshot?.operationalStage === "trip_completed" &&
      b.selfDriveSnapshot?.depositRefundStatus === "none" &&
      b.paymentStatus.toLowerCase() === "paid"
    );
  }

  function passengerTel(mobile?: string) {
    const digits = String(mobile ?? "").replace(/\D/g, "");
    return digits.length >= 10 ? `tel:+91${digits.slice(-10)}` : undefined;
  }

  function passengerWhatsApp(mobile?: string) {
    const digits = String(mobile ?? "").replace(/\D/g, "");
    return digits.length >= 10 ? `https://wa.me/91${digits.slice(-10)}` : undefined;
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
                  const sdPay = getOwnerSelfDrivePaymentSummary(b);
                  const selfDrive = isSelfDrive(b);
                  return (
                    <tr key={b.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium">
                        {b.bookingReference}
                        {selfDrive && sdPay && (
                          <div className="mt-1 space-y-0.5 text-[10px] font-normal text-gray-500">
                            <p>Advance {formatINR(sdPay.advanceReceived)} · Deposit {formatINR(sdPay.depositReceived)}</p>
                            <p>
                              {sdPay.balancePending > 0
                                ? `Balance due ${formatINR(sdPay.balancePending)}`
                                : `Balance received ${formatINR(sdPay.balanceReceived)}`}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">{b.passengerName}</td>
                      <td className="px-4 py-3 capitalize">{b.bookingType}</td>
                      <td className="max-w-[120px] truncate px-4 py-3 text-gray-600">{b.pickupLocation ?? "—"}</td>
                      <td className="max-w-[120px] truncate px-4 py-3 text-gray-600">{b.dropLocation ?? "—"}</td>
                      <td className="px-4 py-3 font-bold text-primary">{formatINR(b.amount)}</td>
                      <td className="px-4 py-3 capitalize">{ownerPaymentStatusLabel(b)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${OWNER_STATUS_STYLES[kind]}`}>
                          {ownerBookingStatusLabel(b)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{ownerBookingStatusLabel(b)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition hover:bg-primary hover:text-white" title="View"><Eye className="h-3 w-3" /></button>
                          <a href={passengerTel(b.passengerMobile) ?? "#"} className={`inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition hover:bg-primary hover:text-white ${passengerTel(b.passengerMobile) ? "" : "pointer-events-none opacity-40"}`} title="Call"><Phone className="h-3 w-3" /></a>
                          <a href={passengerWhatsApp(b.passengerMobile) ?? "#"} target="_blank" rel="noopener noreferrer" className={`inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition hover:bg-primary hover:text-white ${passengerWhatsApp(b.passengerMobile) ? "" : "pointer-events-none opacity-40"}`} title="WhatsApp"><MessageCircle className="h-3 w-3" /></a>
                          {!selfDrive && tab === "upcoming" && b.bookingStatus.toLowerCase() === "pending" && (
                            <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-emerald-600 transition hover:bg-emerald-600 hover:text-white" title="Approve" onClick={() => handleApprove(b)}>
                              <Play className="h-3 w-3" />
                            </button>
                          )}
                          {selfDrive && canCollectBalance(b) && (
                            <button
                              type="button"
                              className="inline-flex h-7 items-center gap-1 rounded-lg bg-amber-100 px-2 text-[10px] font-semibold text-amber-800 transition hover:bg-amber-600 hover:text-white"
                              title="Collect Remaining Balance"
                              onClick={() => handleCollectBalance(b)}
                            >
                              <IndianRupee className="h-3 w-3" />
                              Collect Balance
                            </button>
                          )}
                          {selfDrive && canHandover(b) && (
                            <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-blue-600 transition hover:bg-blue-600 hover:text-white" title="Handover Vehicle" onClick={() => handleHandover(b)}>
                              <Key className="h-3 w-3" />
                            </button>
                          )}
                          {(tab === "active" || tab === "upcoming") && canStartTrip(b) && (
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-emerald-600 transition hover:bg-emerald-600 hover:text-white"
                              title="Start Trip"
                              onClick={() => (selfDrive ? handleSelfDriveStart(b) : handleStartTrip(b))}
                            >
                              <Play className="h-3 w-3" />
                            </button>
                          )}
                          {(tab === "active" || tab === "upcoming") && !selfDrive && (
                            <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-blue-600 transition hover:bg-blue-600 hover:text-white" title="Complete" onClick={() => handleCompleteTripAction(b)}>
                              <Square className="h-3 w-3" />
                            </button>
                          )}
                          {selfDrive && b.selfDriveSnapshot?.operationalStage === "trip_started" && (
                            <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-blue-600 transition hover:bg-blue-600 hover:text-white" title="Complete Trip" onClick={() => handleSelfDriveComplete(b)}>
                              <Square className="h-3 w-3" />
                            </button>
                          )}
                          {selfDrive && canProcessRefund(b) && (
                            <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-emerald-600 transition hover:bg-emerald-600 hover:text-white" title="Refund Deposit" onClick={() => handleSelfDriveRefund(b)}>
                              <RotateCcw className="h-3 w-3" />
                            </button>
                          )}
                          {(tab === "upcoming" && b.bookingStatus.toLowerCase() === "pending" && !selfDrive) && (
                            <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-red-500 transition hover:bg-red-600 hover:text-white" title="Reject" onClick={() => handleReject(b)}>
                              <X className="h-3 w-3" />
                            </button>
                          )}
                          {tab !== "upcoming" && (
                            <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-red-500 transition hover:bg-red-600 hover:text-white" title="Cancel" onClick={() => show("Contact support to cancel paid bookings", "info")}>
                              <X className="h-3 w-3" />
                            </button>
                          )}
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
