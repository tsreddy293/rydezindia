import { redirect } from "next/navigation";

export default function LegacyUserLoginRedirect() {
  redirect("/login/rider");
}
