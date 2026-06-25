import Link from "next/link";
import type { AdminDashboardData } from "@/lib/admin/dashboard-types";

export default function UserManagementSection({
  data,
}: {
  data: AdminDashboardData["userManagement"];
}) {
  const cards = [
    { label: "Owners", value: data.owners, href: "/admin/owner-management", color: "bg-blue-50 border-blue-100" },
    { label: "Customers", value: data.customers, href: "/admin/customer-management", color: "bg-violet-50 border-violet-100" },
    { label: "Blocked Users", value: data.blocked, href: "/admin/customer-management", color: "bg-red-50 border-red-100" },
    { label: "Verified Users", value: data.verified, href: "/admin/customer-management", color: "bg-emerald-50 border-emerald-100" },
  ];

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-secondary">User Management</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
