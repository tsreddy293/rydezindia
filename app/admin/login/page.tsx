import { redirect } from "next/navigation";
import { ADMIN_LOGIN_PATH } from "@/lib/auth/rbac-paths";

export default function LegacyAdminLoginRedirect() {
  redirect(ADMIN_LOGIN_PATH);
}
