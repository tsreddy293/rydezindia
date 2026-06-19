"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import type { AdminOwnerManagementRecord, OwnerStatus } from "@/types/database";
import {
  approveOwnerAction,
  approveOwnerKycAction,
  rejectOwnerAction,
  rejectOwnerKycAction,
} from "@/server/actions/adminManagement";

type Filter = "all" | "pending" | "approved" | "rejected";

interface Props {
  owners: AdminOwnerManagementRecord[];
}

function DocLink({ url, label }: { url?: string; label: string }) {
  if (!url) return <p className="text-sm text-gray-400">{label}: Not uploaded</p>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary underline">
      View {label}
    </a>
  );
}

function patchOwnerRecord(
  owner: AdminOwnerManagementRecord,
  patch: Partial<AdminOwnerManagementRecord>
): AdminOwnerManagementRecord {
  return { ...owner, ...patch };
}

export default function AdminOwnerManagementClient({ owners: initialOwners }: Props) {
  const router = useRouter();
  const [owners, setOwners] = useState(initialOwners);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminOwnerManagementRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setOwners(initialOwners);
  }, [initialOwners]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return owners
      .filter((owner) => {
        if (filter === "all") return true;
        if (filter === "pending") return owner.kycStatus === "pending" || owner.ownerStatus === "pending";
        if (filter === "approved") return owner.kycStatus === "approved" || owner.ownerStatus === "approved";
        return owner.kycStatus === "rejected" || owner.ownerStatus === "rejected";
      })
      .filter((owner) => {
        if (!q) return true;
        return (
          owner.name.toLowerCase().includes(q) ||
          owner.email.toLowerCase().includes(q) ||
          owner.mobile.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [owners, filter, search]);

  function applyOwnerPatch(ownerId: string, patch: Partial<AdminOwnerManagementRecord>) {
    setOwners((current) =>
      current.map((owner) => (owner.id === ownerId ? patchOwnerRecord(owner, patch) : owner))
    );
    setSelected((current) =>
      current?.id === ownerId ? patchOwnerRecord(current, patch) : current
    );
  }

  async function runAction(
    ownerId: string,
    action: () => Promise<{ success: boolean; error?: string; message?: string }>,
    onSuccess?: () => void
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    const result = await action();
    if (result.success) {
      setMessage(result.message ?? "Updated.");
      onSuccess?.();
      router.refresh();
    } else {
      console.error("[AdminOwnerManagementClient] action failed", result.error);
      setError(result.error ?? "Action failed.");
    }
    setBusy(false);
  }

  async function handleApproveKyc(owner: AdminOwnerManagementRecord) {
    console.log("Approve KYC clicked");
    console.log("Owner ID:", owner.id);

    await runAction(owner.id, () => approveOwnerKycAction(owner.id), () => {
      applyOwnerPatch(owner.id, {
        kycStatus: "approved" as OwnerStatus,
        canApproveKyc: false,
        canApproveOwner: owner.ownerStatus !== "approved",
      });
      setMessage("KYC Approved Successfully");
    });
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Search name, email, mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs rounded-xl border px-3 py-2 text-sm"
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
              <th className="px-4 py-3 font-medium">Owner Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Mobile</th>
              <th className="px-4 py-3 font-medium">City</th>
              <th className="px-4 py-3 font-medium">Vehicles</th>
              <th className="px-4 py-3 font-medium">KYC Status</th>
              <th className="px-4 py-3 font-medium">Owner Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((owner) => (
              <tr key={owner.id} className="align-top">
                <td className="px-4 py-4 font-medium">{owner.name}</td>
                <td className="px-4 py-4">{owner.email || "-"}</td>
                <td className="px-4 py-4">{owner.mobile || "-"}</td>
                <td className="px-4 py-4">{owner.city || "-"}</td>
                <td className="px-4 py-4">{owner.vehicleCount}</td>
                <td className="px-4 py-4"><AdminStatusBadge status={owner.kycStatus} /></td>
                <td className="px-4 py-4"><AdminStatusBadge status={owner.ownerStatus} /></td>
                <td className="px-4 py-4 text-xs text-gray-500">
                  {owner.created_at ? new Date(owner.created_at).toLocaleDateString("en-IN") : "-"}
                </td>
                <td className="px-4 py-4 min-w-[180px]">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelected(owner)}
                      className="rounded-lg border px-3 py-1 text-xs text-primary hover:bg-primary/5"
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      disabled={busy || owner.kycStatus !== "approved" || owner.ownerStatus === "approved"}
                      title={owner.kycStatus !== "approved" ? "KYC must be approved first." : undefined}
                      onClick={() =>
                        runAction(owner.id, () => approveOwnerAction(owner.id), () => {
                          applyOwnerPatch(owner.id, {
                            ownerStatus: "approved",
                            canApproveOwner: false,
                          });
                        })
                      }
                      className="rounded-lg border px-3 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-40"
                    >
                      Approve Owner
                    </button>
                    <button
                      type="button"
                      disabled={busy || owner.ownerStatus === "rejected"}
                      onClick={() =>
                        runAction(owner.id, () => rejectOwnerAction(owner.id), () => {
                          applyOwnerPatch(owner.id, { ownerStatus: "rejected", canApproveOwner: false });
                        })
                      }
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      Reject Owner
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-8 text-center text-gray-500">No owners match your filters.</p>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-secondary">{selected.name}</h2>
                <p className="text-sm text-gray-500">Owner profile & KYC review</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <section className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Personal Details</h3>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-gray-500">Email</dt><dd>{selected.email || "-"}</dd></div>
                <div><dt className="text-gray-500">Mobile</dt><dd>{selected.mobile || "-"}</dd></div>
                <div><dt className="text-gray-500">City</dt><dd>{selected.city || "-"}</dd></div>
                <div><dt className="text-gray-500">Registered</dt><dd>{selected.created_at ? new Date(selected.created_at).toLocaleString("en-IN") : "-"}</dd></div>
              </dl>
            </section>

            <section className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">KYC Documents</h3>
                <AdminStatusBadge status={selected.kycStatus} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 rounded-xl bg-gray-50 p-4">
                <DocLink url={selected.documents.aadhaar} label="Aadhaar Card" />
                <DocLink url={selected.documents.license} label="Driving License" />
                <DocLink url={selected.documents.selfie} label="Selfie Photo" />
                <DocLink url={selected.documents.address_proof} label="Address Proof" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || selected.kycStatus === "approved"}
                  onClick={() => handleApproveKyc(selected)}
                  className="rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
                >
                  Approve KYC
                </button>
                <button
                  type="button"
                  disabled={busy || selected.kycStatus === "rejected"}
                  onClick={() =>
                    runAction(selected.id, () => rejectOwnerKycAction(selected.id), () => {
                      applyOwnerPatch(selected.id, {
                        kycStatus: "rejected",
                        canApproveKyc: false,
                        canApproveOwner: false,
                      });
                    })
                  }
                  className="rounded-lg border border-red-200 px-4 py-2 text-xs text-red-600 disabled:opacity-40"
                >
                  Reject KYC
                </button>
              </div>
            </section>

            <section className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Vehicles ({selected.vehicles.length})</h3>
              {selected.vehicles.length === 0 ? (
                <p className="text-sm text-gray-500">No vehicles yet.</p>
              ) : (
                <ul className="space-y-2">
                  {selected.vehicles.map((vehicle) => (
                    <li key={vehicle.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                      <span>{vehicle.name} · {vehicle.registration_number}</span>
                      <AdminStatusBadge status={vehicle.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <button
                type="button"
                disabled={busy || selected.kycStatus !== "approved" || selected.ownerStatus === "approved"}
                title={selected.kycStatus !== "approved" ? "KYC must be approved first." : undefined}
                onClick={() =>
                  runAction(selected.id, () => approveOwnerAction(selected.id), () => {
                    applyOwnerPatch(selected.id, {
                      ownerStatus: "approved",
                      canApproveOwner: false,
                    });
                  })
                }
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                Approve Owner
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  runAction(selected.id, () => rejectOwnerAction(selected.id), () => {
                    applyOwnerPatch(selected.id, { ownerStatus: "rejected", canApproveOwner: false });
                  })
                }
                className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600"
              >
                Reject Owner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
