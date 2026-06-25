import { redirect } from "next/navigation";
import { RIDER_BOOKINGS_PATH } from "@/lib/auth/rbac-paths";

/** Legacy alias — canonical rider bookings URL is /dashboard/bookings */
export default function UserBookingsRedirectPage() {
  redirect(RIDER_BOOKINGS_PATH);
}
