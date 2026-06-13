import Link from "next/link";
import { AdminPageShell, AdminTable } from "@/components/admin/AdminTable";
import { getAdminRows } from "@/lib/supabase/queries";
import { formatINR } from "@/lib/utils";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  await requireRole("admin");
  const payments = await getAdminRows("payments", "id, booking_id, razorpay_order_id, razorpay_payment_id, amount, currency, status, created_at", 100);

  return (
    <AdminPageShell title="Payment Management" description="View transactions, refunds, and export reports">
      <div className="mb-4">
        <Link href="/api/reports/export?type=payments" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white">
          Export CSV
        </Link>
      </div>
      <AdminTable
        headers={["Order", "Payment", "Booking", "Amount", "Status"]}
        rows={payments.map((payment) => [
          String(payment.razorpay_order_id ?? "-"),
          String(payment.razorpay_payment_id ?? "-"),
          String(payment.booking_id ?? "-"),
          `${formatINR(Number(payment.amount ?? 0))} ${payment.currency ?? "INR"}`,
          String(payment.status ?? "created"),
        ])}
      />
    </AdminPageShell>
  );
}
