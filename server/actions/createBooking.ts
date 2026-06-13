"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getJourneyById } from "@/lib/supabase/queries";
import { getSupabaseConfigError } from "@/lib/supabase/env";
import type { ActionResult, CreateBookingInput, CreateMarketplaceBookingInput } from "@/types/database";

const MOBILE_REGEX = /^[6-9]\d{9}$/;

/** Create a booking for a return journey */
export async function createBooking(
  input: CreateBookingInput
): Promise<ActionResult<{ id: string }>> {
  const configError = getSupabaseConfigError();
  if (configError) return { success: false, error: configError };

  if (!input.passenger_name.trim()) {
    return { success: false, error: "Passenger name is required" };
  }
  if (!MOBILE_REGEX.test(input.mobile.replace(/\s/g, ""))) {
    return { success: false, error: "Enter a valid 10-digit mobile number" };
  }
  if (input.seats_booked < 1) {
    return { success: false, error: "At least 1 seat is required" };
  }

  const journey = await getJourneyById(input.ride_id);
  if (!journey) {
    return { success: false, error: "Journey not found" };
  }

  const availableSeats = Number(journey.available_seats);
  const pricePerSeat = Number(journey.price ?? journey.price_per_seat);
  const ownerId = String(
    (journey.owner as { id?: string } | null)?.id ?? journey.owner_id
  );

  if (availableSeats < input.seats_booked) {
    return { success: false, error: `Only ${availableSeats} seats available` };
  }

  const db = createAdminClient();
  const mobile = input.mobile.replace(/\s/g, "");
  const amount = pricePerSeat * input.seats_booked;

  // Find or create passenger user
  const { data: existingUser } = await db
    .from("users")
    .select("id")
    .eq("mobile", mobile)
    .maybeSingle();

  let userId = (existingUser as { id: string } | null)?.id;

  if (!userId) {
    const { data: newUser, error: userError } = await db
      .from("users")
      .insert({
        id: crypto.randomUUID(),
        name: input.passenger_name.trim(),
        email: `${mobile}@rydezindia.guest`,
        mobile,
        role: "user",
      } as Record<string, unknown>)
      .select("id")
      .single();

    if (userError) {
      userId = ownerId;
    } else {
      userId = newUser.id as string;
    }
  }

  const bookingPayload: Record<string, unknown> = {
    ride_id: input.ride_id,
    booking_type: "return_journey",
    reference_id: input.ride_id,
    vehicle_id: journey.vehicle_id,
    user_id: userId!,
    owner_id: ownerId,
    seats_booked: input.seats_booked,
    amount,
    payment_status: "pending",
    booking_status: "pending",
  };

  // Optional columns — ignored if not in schema
  bookingPayload.passenger_name = input.passenger_name.trim();
  bookingPayload.mobile = mobile;

  const { data: booking, error: bookingError } = await db
    .from("bookings")
    .insert(bookingPayload as Record<string, unknown>)
    .select("id")
    .single();

  if (bookingError?.message?.includes("column")) {
    delete bookingPayload.booking_type;
    delete bookingPayload.reference_id;
    delete bookingPayload.vehicle_id;
    delete bookingPayload.passenger_name;
    delete bookingPayload.mobile;
    const retry = await db
      .from("bookings")
      .insert(bookingPayload as Record<string, unknown>)
      .select("id")
      .single();
    if (retry.error) return { success: false, error: retry.error.message };
    await db
      .from("return_journeys")
      .update({
        available_seats: availableSeats - input.seats_booked,
        status: availableSeats - input.seats_booked <= 0 ? "booked" : "available",
      })
      .eq("id", input.ride_id);
    revalidatePath("/");
    revalidatePath("/search");
    revalidatePath("/admin");
    return { success: true, data: { id: retry.data!.id as string } };
  }

  if (bookingError) {
    return { success: false, error: bookingError.message };
  }

  await db
    .from("return_journeys")
    .update({
      available_seats: availableSeats - input.seats_booked,
      status: availableSeats - input.seats_booked <= 0 ? "booked" : "available",
    })
    .eq("id", input.ride_id);

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/admin");

  return { success: true, data: { id: booking!.id as string } };
}

export async function createMarketplaceBooking(
  input: CreateMarketplaceBookingInput
): Promise<ActionResult<{ id: string }>> {
  const configError = getSupabaseConfigError();
  if (configError) return { success: false, error: configError };

  if (!input.passenger_name.trim()) {
    return { success: false, error: "Passenger name is required" };
  }
  if (!MOBILE_REGEX.test(input.mobile.replace(/\s/g, ""))) {
    return { success: false, error: "Enter a valid 10-digit mobile number" };
  }
  if (input.amount < 0) {
    return { success: false, error: "Amount must be positive" };
  }

  const db = createAdminClient();
  const mobile = input.mobile.replace(/\s/g, "");

  const { data: existingUser } = await db
    .from("users")
    .select("id")
    .eq("mobile", mobile)
    .maybeSingle();

  let userId = (existingUser as { id: string } | null)?.id;

  if (!userId) {
    const { data: newUser, error: userError } = await db
      .from("users")
      .insert({
        id: crypto.randomUUID(),
        name: input.passenger_name.trim(),
        full_name: input.passenger_name.trim(),
        email: `${mobile}@rydezindia.guest`,
        mobile,
        role: "user",
      } as Record<string, unknown>)
      .select("id")
      .single();

    if (userError) return { success: false, error: userError.message };
    userId = newUser.id as string;
  }

  const { data: booking, error } = await db
    .from("bookings")
    .insert({
      booking_type: input.booking_type,
      user_id: userId,
      vehicle_id: input.vehicle_id,
      reference_id: input.reference_id,
      amount: input.amount,
      booking_status: "pending",
      payment_status: "pending",
      passenger_name: input.passenger_name.trim(),
      mobile,
    } as Record<string, unknown>)
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin");
  revalidatePath("/owner/dashboard");
  revalidatePath(input.booking_type === "self_drive" ? "/search-self-drive" : "/search-driver");

  return { success: true, data: { id: booking.id as string } };
}
