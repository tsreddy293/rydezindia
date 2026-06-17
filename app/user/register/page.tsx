import { redirect } from "next/navigation";

export default function LegacyUserRegisterRedirect() {
  redirect("/signup/rider");
}
