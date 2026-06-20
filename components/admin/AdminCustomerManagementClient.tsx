"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import type { AdminCustomerManagementRecord } from "@/types/database";
import {
  approveCustomerKycAction,
  rejectCustomerKycAction,
} from "@/server/actions/adminManagement";

type Filter = "all" | "pending" | "approved" | "rejected";

interface Props {
  customers: AdminCustomerManagementRecord[];
}

function DocLink({ url, label }: { url?: string; label: string }) {
  if (!url) return <p className="text-sm text-gray-400">{label}: Not uploaded</p>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary underline">
      View {label}
    </a>
  );
}

export default function AdminCustomerManagementClient({ customers }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminCustomerManagementRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers
      .filter((customer) => {
        if (filter === "all") return true;
        return customer.kycStatus === filter;
      })
      .filter((customer) => {
        if (!q) return true;
        return (
          customer.name.toLowerCase().includes(q) ||
          customer.email.toLowerCase().includes(q) ||
          customer.mobile.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [customers, filter, search]);

  async function runAction(action: () => Promise<{ success: boolean; error?: string; message?: string }>) {
    setBusy(true);
    setError("");
    setMessage("");
    const result = await action();
    if (result.success) {
      setMessage(result.message ?? "Updated.");
      router.refresh();
    } else {
      setError(result.error ?? "Action failed.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Search by name, mobile, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-sm rounded-xl border px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "approved", "rejected"] as Filter[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${
                filter === value ? "bg-primary text-white" : "border bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Customer Name</th>
              <th className="px-4 py-3 font-medium">Mobile</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">KYC Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((customer) => (
              <tr key={customer.id} className="align-top">
                <td className="px-4 py-4 font-medium">{customer.name}</td>
                <td className="px-4 py-4">{customer.mobile || "-"}</td>
                <td className="px-4 py-4">{customer.email || "-"}</td>
                <td className="px-4 py-4"><AdminStatusBadge status={customer.kycStatus} /></td>
                <td className="px-4 py-4 min-w-[220px]">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelected(customer)}
                      className="rounded-lg border px-3 py-1 text-xs text-primary hover:bg-primary/5"
                    >
                      View Documents
                    </button>
                    <button
                      type="button"
                      disabled={busy || !customer.canApproveKyc || customer.kycStatus === "approved"}
                      title={!customer.canApproveKyc ? "Required documents must be uploaded first." : undefined}
                      onClick={() => runAction(() => approveCustomerKycAction(customer.id))}
                      className="rounded-lg border px-3 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy || customer.kycStatus === "not_submitted"}
                      onClick={() => runAction(() => rejectCustomerKycAction(customer.id))}
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-8 text-center text-gray-500">No customers match your search.</p>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-secondary">{selected.name}</h2>
                <p className="text-sm text-gray-500">{selected.mobile || "-"} · {selected.email || "-"}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <section className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">KYC Documents</h3>
                <AdminStatusBadge status={selected.kycStatus} />
              </div>
              <div className="grid gap-2 rounded-xl bg-gray-50 p-4">
                <DocLink url={selected.documents.aadhaar_front} label="Aadhaar Front" />
                <DocLink url={selected.documents.aadhaar_back} label="Aadhaar Back" />
                <DocLink url={selected.documents.driving_license} label="Driving License" />
                <DocLink url={selected.documents.selfie} label="Selfie" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !selected.canApproveKyc || selected.kycStatus === "approved"}
                  onClick={() => runAction(() => approveCustomerKycAction(selected.id))}
                  className="rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
                >
                  Approve KYC
                </button>
                <button
                  type="button"
                  disabled={busy || selected.kycStatus === "not_submitted"}
                  onClick={() => runAction(() => rejectCustomerKycAction(selected.id))}
                  className="rounded-lg border border-red-200 px-4 py-2 text-xs text-red-600 disabled:opacity-40"
                >
                  Reject KYC
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
