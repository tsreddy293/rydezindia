"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import OwnerPageToolbar from "@/components/owner/shared/OwnerPageToolbar";
import { useOwnerToast } from "@/components/owner/shared/useOwnerToast";
import { downloadCsv } from "@/lib/owner/export-utils";
import { formatDate, formatINR } from "@/lib/utils";

interface Props {
  currentBalance: number;
  pendingBalance: number;
  withdrawable: number;
  lastSettlement?: string;
  bankAccount?: string;
  ifsc?: string;
  withdrawHistory: Array<{ id: string; date: string; amount: number; status: string }>;
}

export default function OwnerWalletHub({
  currentBalance,
  pendingBalance,
  withdrawable,
  lastSettlement,
  bankAccount,
  ifsc,
  withdrawHistory,
}: Props) {
  const router = useRouter();
  const { show, Toast } = useOwnerToast();

  return (
    <div className="space-y-6">
      {Toast}
      <OwnerPageToolbar
        onRefresh={() => router.refresh()}
        onExport={() =>
          downloadCsv("wallet-history.csv", ["Date", "Amount", "Status"], withdrawHistory.map((h) => [h.date, String(h.amount), h.status]))
        }
        exportLabel="Download Statement"
      />

      <div className="rounded-2xl bg-gradient-to-br from-secondary via-secondary to-primary p-8 text-white shadow-xl">
        <p className="text-sm text-white/80">Current Balance</p>
        <p className="mt-1 text-4xl font-bold">{formatINR(currentBalance)}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-white/70">Pending</p>
            <p className="text-lg font-semibold">{formatINR(pendingBalance)}</p>
          </div>
          <div>
            <p className="text-xs text-white/70">Withdrawable</p>
            <p className="text-lg font-semibold">{formatINR(withdrawable)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => show("Withdrawal requests are processed within 2–3 business days", "info")}
          className="mt-6 rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-secondary"
        >
          Withdraw
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="font-semibold">Bank Account</h3>
          <p className="mt-2 font-mono text-sm">{bankAccount ? `****${bankAccount.slice(-4)}` : "Not added"}</p>
          {ifsc && <p className="text-xs text-gray-500">IFSC: {ifsc}</p>}
          <Link href="/owner/profile" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            Add / Update Bank →
          </Link>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="font-semibold">UPI</h3>
          <p className="mt-2 text-sm text-gray-500">Link UPI in profile settings</p>
          <Link href="/owner/profile" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            Update Profile →
          </Link>
        </div>
      </div>

      {lastSettlement && (
        <p className="text-sm text-gray-500">Last settlement: {formatDate(lastSettlement)}</p>
      )}

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Withdraw History</h3>
        {withdrawHistory.length === 0 ? (
          <p className="text-sm text-gray-500">No withdrawals yet.</p>
        ) : (
          <ul className="divide-y">
            {withdrawHistory.map((h) => (
              <li key={h.id} className="flex justify-between py-3 text-sm">
                <span>{formatDate(h.date)}</span>
                <span className="font-semibold">{formatINR(h.amount)}</span>
                <span className="capitalize text-gray-500">{h.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
