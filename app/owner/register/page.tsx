import { redirect } from "next/navigation";

export default function LegacyOwnerRegisterRedirect() {
  redirect("/signup/owner");
}
