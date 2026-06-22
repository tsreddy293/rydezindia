import { redirect } from "next/navigation";
import { ADMIN_HOME_PATH } from "@/lib/auth/rbac-paths";

/** Alias — admin home is /admin. */
export default function AdminDashboardAliasPage() {
  redirect(ADMIN_HOME_PATH);
}
