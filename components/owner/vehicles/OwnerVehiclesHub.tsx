"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Car,
  Copy,
  DollarSign,
  Edit,
  Eye,
  FileText,
  Image,
  Loader2,
  MapPin,
  MoreHorizontal,
  Star,
  Trash2,
  ToggleLeft,
} from "lucide-react";
import OwnerPageToolbar from "@/components/owner/shared/OwnerPageToolbar";
import OwnerConfirmDialog from "@/components/owner/shared/OwnerConfirmDialog";
import OwnerEmptyState from "@/components/owner/dashboard/ui/OwnerEmptyState";
import { useOwnerToast } from "@/components/owner/shared/useOwnerToast";
import { downloadCsv } from "@/lib/owner/export-utils";
import { OWNER_STATUS_STYLES, resolveVehicleStatusKind } from "@/lib/owner/owner-status-styles";
import VehicleCapabilityBadges from "@/components/vehicles/VehicleCapabilityBadges";
import { deleteOwnerVehicle } from "@/server/actions/vehicles";
import { vehicleDisplayName, type OwnerVehicleRow } from "@/lib/vehicles/format";
import { formatINR } from "@/lib/utils";

const CATEGORY_FUEL: Record<string, string> = {
  Hatchback: "Petrol",
  Sedan: "Petrol",
  SUV: "Diesel",
  Luxury: "Petrol",
  Van: "Diesel",
  "Tempo Traveller": "Diesel",
  "Mini Bus": "Diesel",
};

type SortKey = "newest" | "booked" | "earnings";

interface Props {
  vehicles: OwnerVehicleRow[];
  completedTrips: number;
  lifetimeEarnings: number;
}

export default function OwnerVehiclesHub({ vehicles, completedTrips, lifetimeEarnings }: Props) {
  const router = useRouter();
  const { show, Toast } = useOwnerToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [location, setLocation] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [expandedActions, setExpandedActions] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 9;

  const categories = useMemo(() => [...new Set(vehicles.map((v) => v.vehicle_category))], [vehicles]);
  const cities = useMemo(
    () => [...new Set(vehicles.map((v) => v.city).filter(Boolean))] as string[],
    [vehicles]
  );

  const tripsPerVehicle = vehicles.length > 0 ? Math.round(completedTrips / vehicles.length) : 0;
  const earningsPerVehicle = vehicles.length > 0 ? Math.round(lifetimeEarnings / vehicles.length) : 0;

  const filtered = useMemo(() => {
    let list = [...vehicles];
    const q = search.toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          vehicleDisplayName(v).toLowerCase().includes(q) ||
          v.registration_number.toLowerCase().includes(q) ||
          v.vehicle_category.toLowerCase().includes(q)
      );
    }
    if (category !== "all") list = list.filter((v) => v.vehicle_category === category);
    if (statusFilter !== "all") {
      list = list.filter((v) => {
        if (statusFilter === "disabled") return v.is_active === false;
        return v.approval_status === statusFilter;
      });
    }
    if (location !== "all") list = list.filter((v) => v.city === location);
    if (sort === "newest") list.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    if (sort === "booked") list.sort((a, b) => (b.approval_status === "approved" ? 1 : 0) - (a.approval_status === "approved" ? 1 : 0));
    if (sort === "earnings") list.sort((a, b) => (b.daily_fare ?? 0) - (a.daily_fare ?? 0));
    return list;
  }, [vehicles, search, category, statusFilter, location, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    const result = await deleteOwnerVehicle(confirmDelete.id);
    if (result.success) {
      show("Vehicle deleted", "success");
      router.refresh();
    } else show(result.error ?? "Delete failed", "error");
    setDeletingId(null);
    setConfirmDelete(null);
  }

  function handleDuplicate(v: OwnerVehicleRow) {
    const payload = {
      vehicle_make: v.vehicle_make,
      vehicle_model: v.vehicle_model,
      vehicle_category: v.vehicle_category,
      vehicle_year: v.vehicle_year,
    };
    sessionStorage.setItem("owner-duplicate-vehicle", JSON.stringify(payload));
    router.push("/owner/add-vehicle?duplicate=1");
    show("Vehicle details prefilled — update registration number", "info");
  }

  function handleExport() {
    downloadCsv(
      "my-vehicles.csv",
      ["Name", "Registration", "Category", "Status", "City", "Daily Price"],
      filtered.map((v) => [
        vehicleDisplayName(v),
        v.registration_number,
        v.vehicle_category,
        v.approval_status,
        v.city ?? "",
        String(v.daily_fare ?? 0),
      ])
    );
  }

  if (vehicles.length === 0) {
    return (
      <>
        {Toast}
        <OwnerEmptyState
          icon={Car}
          title="No Vehicles Added"
          description="Use + Add Vehicle above to register your first vehicle and start earning."
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {Toast}
      <OwnerPageToolbar
        searchPlaceholder="Search vehicles…"
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onRefresh={() => router.refresh()}
        onExport={handleExport}
      >
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="disabled">Disabled</option>
        </select>
        {cities.length > 0 && (
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="all">All Locations</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-xl border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="newest">Newest</option>
          <option value="booked">Most Active</option>
          <option value="earnings">Highest Price</option>
        </select>
      </OwnerPageToolbar>

      <p className="text-sm text-gray-500">
        Showing {paginated.length} of {filtered.length} vehicle(s)
      </p>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {paginated.map((v) => {
          const name = vehicleDisplayName(v);
          const kind = resolveVehicleStatusKind(v.approval_status, v.is_active);
          const canDelete = v.approval_status !== "approved";
          const canEditFull = v.approval_status !== "approved";
          const canEditServices = v.approval_status === "approved";
          const fuel = CATEGORY_FUEL[v.vehicle_category] ?? "Petrol";
          const seats = v.vehicle_category.includes("Bus") ? 12 : v.vehicle_category === "Van" ? 7 : 5;

          return (
            <article
              key={v.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="relative h-48 bg-gradient-to-br from-secondary to-primary">
                {v.vehicle_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.vehicle_photo_url} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Car className="h-14 w-14 text-white/25" />
                  </div>
                )}
                <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ring-1 ring-inset ${OWNER_STATUS_STYLES[kind]}`}>
                  {kind}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-bold text-secondary dark:text-white">{name}</h3>
                <p className="text-sm text-gray-500">{v.registration_number}</p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <span>{v.vehicle_category}</span>
                  <span>{fuel} · Auto</span>
                  <span>{seats} seats</span>
                  {v.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {v.city}
                    </span>
                  )}
                </div>

                {v.daily_fare != null && v.daily_fare > 0 && (
                  <p className="mt-3 text-xl font-bold text-primary">
                    {formatINR(v.daily_fare)}
                    <span className="text-xs font-normal text-gray-500">/day</span>
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <VehicleCapabilityBadges
                    services={{
                      service_self_drive: v.service_self_drive,
                      service_with_driver: v.service_with_driver,
                      service_local_rental: v.service_local_rental,
                      service_return_journey: v.service_return_journey,
                    }}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-lg bg-blue-50 px-2 py-1 text-blue-700">Available</span>
                  <span className="rounded-lg bg-gray-100 px-2 py-1 text-gray-600">{tripsPerVehicle} trips</span>
                  <span className="inline-flex items-center gap-0.5 rounded-lg bg-amber-50 px-2 py-1 text-amber-700">
                    <Star className="h-3 w-3 fill-amber-400" /> 4.8
                  </span>
                  <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700">
                    {formatINR(earningsPerVehicle)}
                  </span>
                </div>

                <div className="mt-4 border-t pt-4">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/owner/view-vehicle/${v.id}`} className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-secondary transition hover:bg-primary hover:text-white">
                      <Eye className="h-3.5 w-3.5" /> View
                    </Link>
                    {canEditFull && (
                      <Link href={`/owner/edit-vehicle/${v.id}`} className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-secondary transition hover:bg-primary hover:text-white">
                        <Edit className="h-3.5 w-3.5" /> Edit
                      </Link>
                    )}
                    {canEditServices && (
                      <Link href={`/owner/edit-vehicle/${v.id}`} className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-secondary transition hover:bg-primary hover:text-white">
                        <Edit className="h-3.5 w-3.5" /> Services
                      </Link>
                    )}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-secondary transition hover:bg-primary hover:text-white"
                      onClick={() => setExpandedActions(expandedActions === v.id ? null : v.id)}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" /> More
                    </button>
                  </div>

                  {expandedActions === v.id && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <Link href={`/owner/edit-vehicle/${v.id}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-100 px-2 py-1.5 font-medium text-gray-600 hover:border-primary hover:text-primary"><Image className="h-3 w-3" /> Photos</Link>
                      <Link href={`/owner/edit-vehicle/${v.id}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-100 px-2 py-1.5 font-medium text-gray-600 hover:border-primary hover:text-primary"><DollarSign className="h-3 w-3" /> Pricing</Link>
                      <Link href={`/owner/edit-vehicle/${v.id}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-100 px-2 py-1.5 font-medium text-gray-600 hover:border-primary hover:text-primary"><Calendar className="h-3 w-3" /> Availability</Link>
                      <Link href={`/owner/view-vehicle/${v.id}`} className="inline-flex items-center gap-1 rounded-lg border border-gray-100 px-2 py-1.5 font-medium text-gray-600 hover:border-primary hover:text-primary"><FileText className="h-3 w-3" /> Documents</Link>
                      <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-gray-100 px-2 py-1.5 font-medium text-gray-600 hover:border-primary hover:text-primary" onClick={() => show("Contact support to disable approved vehicles", "info")}>
                        <ToggleLeft className="h-3 w-3" /> Disable
                      </button>
                      <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-gray-100 px-2 py-1.5 font-medium text-gray-600 hover:border-primary hover:text-primary" onClick={() => handleDuplicate(v)}>
                        <Copy className="h-3 w-3" /> Duplicate
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-2 py-1.5 font-medium text-red-600 hover:bg-red-50"
                          onClick={() => setConfirmDelete({ id: v.id, name })}
                          disabled={deletingId === v.id}
                        >
                          {deletingId === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i + 1)}
              className={`h-9 w-9 rounded-lg text-sm font-medium ${page === i + 1 ? "bg-secondary text-white" : "bg-gray-100 text-gray-600"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      <OwnerConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete vehicle?"
        message={`"${confirmDelete?.name}" will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
