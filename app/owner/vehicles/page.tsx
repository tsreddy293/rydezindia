import { redirect } from "next/navigation";

export default function OwnerVehiclesRedirect() {
  redirect("/owner/my-vehicles");
}
