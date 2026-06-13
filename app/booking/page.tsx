import { redirect } from "next/navigation";

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
  if (vehicle) redirect(`/booking/${vehicle}`);
  redirect("/search");
}
