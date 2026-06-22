import { redirect } from "next/navigation";
import { OWNER_DASHBOARD_INTERNAL_PATH } from "@/lib/auth/rbac-paths";

/** Canonical owner dashboard entry — content lives at /owner/dashboard. */
export default function OwnerDashboardEntryPage() {
  redirect(OWNER_DASHBOARD_INTERNAL_PATH);
}
