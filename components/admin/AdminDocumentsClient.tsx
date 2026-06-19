"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { approveVehicleDocument } from "@/server/actions/phase2Admin";
import type { AdminVehicleDocumentRecord } from "@/types/database";

function DocLink({ url, label }: { url: string | null; label: string }) {
  if (!url) return <span className="text-xs text-gray-400">Not uploaded</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
      {label}
    </a>
  );
}

export default function AdminDocumentsClient({ rows }: { rows: AdminVehicleDocumentRecord[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function run(id: string, approved: boolean) {
    setBusy(id);
    setError("");
    const result = await approveVehicleDocument(id, approved, approved ? undefined : "Documents rejected by admin");
    if (!result.success) setError(result.error ?? "Action failed");
    else router.refresh();
    setBusy(null);
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-12 text-center text-gray-500 shadow-sm">
        No vehicle documents submitted yet.
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Registration</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">RC</th>
              <th className="px-4 py-3 font-medium">Insurance</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-4">{row.vehicle_name}</td>
                <td className="px-4 py-4">{row.registration_number || "-"}</td>
                <td className="px-4 py-4">{row.owner_name}</td>
                <td className="px-4 py-4"><DocLink url={row.rc_url} label="View RC" /></td>
                <td className="px-4 py-4"><DocLink url={row.insurance_url} label="View Insurance" /></td>
                <td className="px-4 py-4"><AdminStatusBadge status={row.verification_status} /></td>
                <td className="px-4 py-4">
                  {row.verification_status === "pending" ? (
                    <>
                      {!row.owner_kyc_approved && (
                        <p className="mb-2 text-xs text-amber-600">Owner KYC must be approved first.</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy === row.id || !row.owner_kyc_approved}
                          onClick={() => run(row.id, true)}
                          className="rounded-lg border px-3 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-40"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busy === row.id}
                          onClick={() => run(row.id, false)}
                          className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
                        >
                          Reject
                        </button>
                      </div>
                    </>
                  ) : (
                    <AdminStatusBadge status={row.verification_status} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
