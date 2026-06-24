import { AdminPageShell } from "@/components/admin/AdminTable";
import AdminProtectionClient from "@/components/admin/AdminProtectionClient";
import { getProtectionAnalytics, getProtectionRefundReport } from "@/lib/services/protection-analytics";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminProtectionPage() {
  await requireRole("admin");
  const [analytics, refundReport] = await Promise.all([
    getProtectionAnalytics(),
    getProtectionRefundReport(30),
  ]);

  return (
    <AdminPageShell
      title="Flexible Cancellation Protection"
      description="Protection sales, revenue, adoption, and refund reports"
    >
      <AdminProtectionClient analytics={analytics} refundReport={refundReport} />
    </AdminPageShell>
  );
}
