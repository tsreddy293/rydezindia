import { createAdminClient } from "@/lib/supabase/admin";

export async function initializeReturnJourneySeats(returnJourneyId: string, totalSeats: number) {
  const db = createAdminClient();
  const { data: existing } = await db
    .from("return_journey_seats")
    .select("id")
    .eq("return_journey_id", returnJourneyId)
    .limit(1);

  if (existing && existing.length > 0) return;

  const rows = Array.from({ length: totalSeats }, (_, i) => ({
    return_journey_id: returnJourneyId,
    seat_number: i + 1,
    status: "available",
  }));

  await db.from("return_journey_seats").insert(rows);
}

export async function getReturnJourneySeats(returnJourneyId: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("return_journey_seats")
    .select("*")
    .eq("return_journey_id", returnJourneyId)
    .order("seat_number", { ascending: true });

  if (error) return [];
  return data ?? [];
}

export async function bookReturnJourneySeats(input: {
  returnJourneyId: string;
  seatNumbers: number[];
  bookingId: string;
  /** When false, caller already decremented return_journeys.available_seats. */
  updateJourneyInventory?: boolean;
}) {
  const db = createAdminClient();
  const seats = await getReturnJourneySeats(input.returnJourneyId);
  const updateInventory = input.updateJourneyInventory !== false;

  for (const seatNum of input.seatNumbers) {
    const seat = seats.find((s) => Number((s as { seat_number: number }).seat_number) === seatNum);
    if (!seat || (seat as { status: string }).status !== "available") {
      throw new Error(`Seat ${seatNum} is not available`);
    }
  }

  for (const seatNum of input.seatNumbers) {
    await db
      .from("return_journey_seats")
      .update({ status: "booked", booking_id: input.bookingId })
      .eq("return_journey_id", input.returnJourneyId)
      .eq("seat_number", seatNum);
  }

  if (!updateInventory) {
    return { bookedSeats: input.seatNumbers, remainingSeats: null };
  }

  const availableCount = seats.filter(
    (s) =>
      !input.seatNumbers.includes(Number((s as { seat_number: number }).seat_number)) &&
      (s as { status: string }).status === "available"
  ).length;

  await db
    .from("return_journeys")
    .update({
      available_seats: availableCount,
      status: availableCount <= 0 ? "booked" : "available",
    })
    .eq("id", input.returnJourneyId);

  return { bookedSeats: input.seatNumbers, remainingSeats: availableCount };
}
