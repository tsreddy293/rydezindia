import { AdminPageShell } from "@/components/admin/AdminTable";
import AdminCouponsClient from "@/components/admin/AdminCouponsClient";
import { listCoupons } from "@/lib/services/coupons";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  await requireRole("admin");
  const coupons = await listCoupons(false);

  return (
    <AdminPageShell title="Coupon Management" description="Create and manage discount coupons">
      <AdminCouponsClient coupons={coupons as Record<string, unknown>[]} />
    </AdminPageShell>
  );
}
