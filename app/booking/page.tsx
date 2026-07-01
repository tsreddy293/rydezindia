import { redirect } from "next/navigation";
import { requireRiderForBooking } from "@/lib/auth/customer-auth";

export const dynamic = "force-dynamic";

/**
 * Legacy demo booking route. Real bookings happen at /booking/[id]
 * with live Supabase journeys, so forward there or back to search.
 */
export default async function BookingIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle?: string }>;
}) {
  const { vehicle } = await searchParams;
  const returnPath = vehicle ? `/booking/${vehicle}` : "/booking";
  await requireRiderForBooking(returnPath);

  if (vehicle) redirect(`/booking/${vehicle}`);
  redirect("/search");
}
