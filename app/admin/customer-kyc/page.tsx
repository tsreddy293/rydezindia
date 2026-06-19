import { redirect } from "next/navigation";

export default function LegacyAdminCustomerKycRedirect() {
  redirect("/admin/customer-management");
}
