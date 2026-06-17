"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getJourneyById } from "@/lib/supabase/queries";
import { getSupabaseConfigError } from "@/lib/supabase/env";
import { generateBookingReference } from "@/lib/services/booking-id";
import { createNotification } from "@/lib/services/notifications";
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

  const bookingReference = await generateBookingReference();

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
    booking_reference: bookingReference,
    passenger_name: input.passenger_name.trim(),
    mobile,
    pickup_location: String(journey.from_city ?? journey.pickup_city ?? ""),
    drop_location: String(journey.to_city ?? journey.drop_city ?? ""),
    pickup_date: journey.journey_date ?? null,
    pickup_time: journey.journey_time ?? null,
    trip_type: "return_journey",
    driver_required: true,
    special_instructions: input.special_instructions ?? null,
    base_fare: amount,
    platform_fee: Math.round(amount * 0.05),
    discount_amount: input.discount_amount ?? 0,
  };

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
  await createNotification({
    recipientId: ownerId,
    recipientRole: "owner",
    type: "new_booking",
    title: "New booking request",
    message: `${input.passenger_name.trim()} requested ${input.seats_booked} seat(s).`,
    metadata: { bookingId: booking!.id, rideId: input.ride_id },
  });

  return { success: true, data: { id: booking!.id as string } };
}

export async function createUnifiedBooking(
  input: CreateMarketplaceBookingInput & {
    pickup_location?: string;
    drop_location?: string;
    pickup_date?: string;
    pickup_time?: string;
    trip_type?: string;
    driver_required?: boolean;
    special_instructions?: string;
    base_fare?: number;
    platform_fee?: number;
    discount_amount?: number;
    owner_id?: string;
  }
): Promise<ActionResult<{ id: string; bookingReference: string }>> {
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
  const bookingReference = await generateBookingReference();

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
      owner_id: input.owner_id ?? null,
      vehicle_id: input.vehicle_id,
      reference_id: input.reference_id,
      amount: input.amount,
      booking_status: "pending",
      payment_status: "pending",
      booking_reference: bookingReference,
      passenger_name: input.passenger_name.trim(),
      mobile,
      pickup_location: input.pickup_location ?? null,
      drop_location: input.drop_location ?? null,
      pickup_date: input.pickup_date ?? null,
      pickup_time: input.pickup_time ?? null,
      trip_type: input.trip_type ?? null,
      driver_required: input.driver_required ?? true,
      special_instructions: input.special_instructions ?? null,
      base_fare: input.base_fare ?? input.amount,
      platform_fee: input.platform_fee ?? Math.round(input.amount * 0.05),
      discount_amount: input.discount_amount ?? 0,
    } as Record<string, unknown>)
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin");
  revalidatePath("/owner/dashboard");
  revalidatePath("/user/dashboard");
  revalidatePath(input.booking_type === "self_drive" ? "/search-self-drive" : "/search-driver");
  await createNotification({
    recipientId: input.owner_id,
    recipientRole: "owner",
    type: "new_booking",
    title: "New booking request",
    message: `${input.passenger_name.trim()} submitted a ${input.booking_type} booking (${bookingReference}).`,
    metadata: { bookingId: booking.id, referenceId: input.reference_id, bookingType: input.booking_type },
  });

  return { success: true, data: { id: booking.id as string, bookingReference } };
}

export async function createMarketplaceBooking(
  input: CreateMarketplaceBookingInput
): Promise<ActionResult<{ id: string }>> {
  const result = await createUnifiedBooking(input);
  if (!result.success) return result;
  return { success: true, data: { id: result.data!.id } };
}
