import { redirect } from "next/navigation";

export default function LegacyAdminOwnersRedirect() {
  redirect("/admin/owner-management");
}
