import { formatINR } from "@/lib/utils";
import type { AdminDashboardData } from "@/lib/admin/dashboard-types";

const FINANCE_ITEMS: Array<{ key: keyof AdminDashboardData["finance"]; label: string; isCount?: boolean }> = [
  { key: "todaysRevenue", label: "Today's Revenue" },
  { key: "monthlyRevenue", label: "Monthly Revenue" },
  { key: "totalRevenue", label: "Total Revenue" },
  { key: "refundAmount", label: "Refund Amount" },
  { key: "pendingPayments", label: "Pending Payments", isCount: true },
  { key: "protectionRevenue", label: "Protection Revenue" },
  { key: "commissionEarned", label: "Commission Earned" },
  { key: "selfDriveAdvancePayments", label: "Self Drive Advance Payments" },
  { key: "selfDrivePendingBalance", label: "Pending Balance Payments", isCount: true },
  { key: "selfDriveDepositHeld", label: "Deposit Held" },
  { key: "selfDriveDepositRefunded", label: "Refund Completed" },
  { key: "selfDriveRefundProcessing", label: "Refund Processing", isCount: true },
  { key: "selfDriveOutstanding", label: "Outstanding Amount" },
];

export default function FinanceSection({ finance }: { finance: AdminDashboardData["finance"] }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-secondary">Finance</h2>
        <p className="text-sm text-gray-500">
          Recognized revenue only — excludes cancelled, pending, and refunded bookings
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {FINANCE_ITEMS.map(({ key, label, isCount }) => {
          const value = finance[key];
          return (
            <div key={key} className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-1 text-xl font-bold text-secondary">
                {isCount ? Number(value).toLocaleString("en-IN") : formatINR(Number(value))}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
