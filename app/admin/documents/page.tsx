import { redirect } from "next/navigation";

export default function LegacyAdminDocumentsRedirect() {
  redirect("/admin/vehicles");
}
