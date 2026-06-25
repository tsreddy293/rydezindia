import Link from "next/link";
import type { AdminDashboardData } from "@/lib/admin/dashboard-types";

export default function VehicleManagementSection({
  data,
}: {
  data: AdminDashboardData["vehicleManagement"];
}) {
  const cards = [
    { label: "Pending", value: data.pending, href: "/admin/vehicles?filter=pending", color: "bg-amber-50 border-amber-100" },
    { label: "Approved", value: data.approved, href: "/admin/vehicles?filter=approved", color: "bg-emerald-50 border-emerald-100" },
    { label: "Rejected", value: data.rejected, href: "/admin/vehicles?filter=rejected", color: "bg-red-50 border-red-100" },
    { label: "Inactive", value: data.inactive, href: "/admin/vehicles", color: "bg-gray-50 border-gray-100" },
    { label: "Blocked", value: data.blocked, href: "/admin/vehicles", color: "bg-orange-50 border-orange-100" },
  ];

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-secondary">Vehicle Management</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`rounded-xl border p-4 transition-shadow hover:shadow-md ${card.color}`}
          >
            <p className="text-2xl font-bold text-secondary">{card.value.toLocaleString("en-IN")}</p>
            <p className="mt-1 text-sm text-gray-600">{card.label}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
