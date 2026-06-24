"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getJourneyById } from "@/lib/supabase/queries";
import { getSupabaseConfigError } from "@/lib/supabase/env";
import { generateBookingReference } from "@/lib/services/booking-id";
import { createNotification } from "@/lib/services/notifications";
import { assertOwnerCanReceiveBookings, assertCustomerCanBookSelfDrive } from "@/lib/services/verification";
import { resolveBookingOwnerContext } from "@/lib/services/owner-approval-sync";
import { assertRecentBookingOtp } from "@/lib/services/otp";
import { getOptionalRiderUser } from "@/server/actions/auth";
import { markSelfDriveInterest } from "@/lib/services/customer-profile";
import { bookReturnJourneySeats, initializeReturnJourneySeats } from "@/lib/services/return-journey-seats";
import { dispatchBookingEvent } from "@/lib/services/messaging";
import { findOrCreateGuestUserByMobile } from "@/lib/users/guest-user";
import { getProtectionFeeForVehicle, getProtectionPlanName } from "@/lib/services/flexible-cancellation-protection";
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

  const mobile = input.mobile.replace(/\s/g, "");
  const otpError = await assertRecentBookingOtp(mobile);
  if (otpError) return { success: false, error: otpError };

  const ownerKycError = await assertOwnerCanReceiveBookings(
    ownerId,
    journey.vehicle_id ? String(journey.vehicle_id) : undefined
  );
  if (ownerKycError) return { success: false, error: ownerKycError };

  await initializeReturnJourneySeats(input.ride_id, availableSeats + input.seats_booked);

  const db = createAdminClient();
  const amount = pricePerSeat * input.seats_booked;

  const guestUser = await findOrCreateGuestUserByMobile(db, input.passenger_name, mobile, {
    fallbackUserId: ownerId,
    failOnError: false,
  });
  const userId = guestUser.userId ?? ownerId;

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
    trip_fare_amount: amount,
    cancellation_status: "active",
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

  const seatNumbers = input.seat_numbers?.length
    ? input.seat_numbers
    : Array.from({ length: input.seats_booked }, (_, i) => i + 1);

  try {
    await bookReturnJourneySeats({
      returnJourneyId: input.ride_id,
      seatNumbers,
      bookingId: booking!.id as string,
    });
  } catch {
    await db
      .from("return_journeys")
      .update({
        available_seats: availableSeats - input.seats_booked,
        status: availableSeats - input.seats_booked <= 0 ? "booked" : "available",
      })
      .eq("id", input.ride_id);
  }

  const bookingPayload2: Record<string, unknown> = { seat_numbers: seatNumbers };
  await db.from("bookings").update(bookingPayload2).eq("id", booking!.id);

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

  await dispatchBookingEvent({
    event: "booking_confirmed",
    customerMobile: mobile,
    payload: { bookingReference, seats: input.seats_booked, amount },
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
    coupon_code?: string;
    wallet_amount_used?: number;
    rural_pickup_point_id?: string;
    flexible_cancellation?: boolean;
    protection_selected?: boolean;
    protection_fee?: number;
    vehicle_type?: string;
    trip_fare_amount?: number;
    security_deposit_amount?: number;
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

  const loggedInRider = await getOptionalRiderUser();
  const skipBookingOtp =
    input.booking_type === "self_drive" &&
    Boolean(loggedInRider) &&
    !(await assertCustomerCanBookSelfDrive(loggedInRider!.user.id));

  if (!skipBookingOtp) {
    const otpError = await assertRecentBookingOtp(mobile);
    if (otpError) return { success: false, error: otpError };
  }

  let ownerId = input.owner_id;
  if (input.vehicle_id) {
    const { data: vehicleRow } = await db
      .from("vehicles")
      .select("id, owner_id, approval_status")
      .eq("id", input.vehicle_id)
      .maybeSingle();

    const vehicleOwnerId = (vehicleRow as { owner_id?: string } | null)?.owner_id;
    if (vehicleOwnerId) {
      ownerId = String(vehicleOwnerId);
    }

    console.log("[createUnifiedBooking] vehicle owner context", {
      vehicleId: input.vehicle_id,
      clientOwnerId: input.owner_id ?? null,
      vehicleOwnerId: vehicleOwnerId ?? null,
      approvalStatus: (vehicleRow as { approval_status?: string } | null)?.approval_status ?? null,
    });
  }

  if (ownerId || input.vehicle_id) {
    const ownerKycError = await assertOwnerCanReceiveBookings(
      ownerId ?? "",
      input.vehicle_id
    );
    if (ownerKycError) return { success: false, error: ownerKycError };
  }

  const bookingOwnerCtx = await resolveBookingOwnerContext({
    vehicleId: input.vehicle_id,
    ownerIdHint: ownerId,
  });
  const bookingOwnerId =
    bookingOwnerCtx.canonicalOwnerId || bookingOwnerCtx.rawOwnerId || ownerId || null;

  const bookingReference = await generateBookingReference();

  let userId: string;
  if (loggedInRider) {
    userId = loggedInRider.user.id;
  } else {
    const guestUser = await findOrCreateGuestUserByMobile(db, input.passenger_name, mobile, {
      failOnError: true,
    });
    if (!guestUser.userId) {
      return { success: false, error: guestUser.error ?? "Failed to create user profile" };
    }
    userId = guestUser.userId;
  }

  if (input.booking_type === "self_drive") {
    await markSelfDriveInterest(userId);
    const kycError = await assertCustomerCanBookSelfDrive(userId);
    if (kycError) return { success: false, error: kycError };
  }

  const protectionSelected = Boolean(input.flexible_cancellation || input.protection_selected);
  const protectionFee = protectionSelected
    ? input.protection_fee ?? getProtectionFeeForVehicle(input.vehicle_type)
    : 0;
  const tripFareBase = input.trip_fare_amount ?? input.amount;
  let finalAmount = input.amount;
  let couponDiscount = 0;
  let couponId: string | null = null;

  if (input.coupon_code?.trim()) {
    const { validateCoupon, redeemCoupon } = await import("@/lib/services/coupons");
    const couponResult = await validateCoupon({
      code: input.coupon_code,
      userId,
      orderAmount: input.amount,
    });
    if (!couponResult.valid) {
      return { success: false, error: couponResult.error ?? "Invalid coupon" };
    }
    couponDiscount = couponResult.discountAmount;
    couponId = couponResult.couponId ?? null;
    finalAmount = Math.max(0, input.amount - couponDiscount);
  }

  let walletUsed = 0;
  if (input.wallet_amount_used && input.wallet_amount_used > 0) {
    const { getWalletBalance, debitWallet } = await import("@/lib/services/wallet");
    const balance = await getWalletBalance(userId);
    walletUsed = Math.min(balance, input.wallet_amount_used, finalAmount);
    if (walletUsed > 0) {
      finalAmount -= walletUsed;
    }
  }

  finalAmount += protectionFee;

  const now = new Date().toISOString();
  const protectionPlanName = protectionSelected
    ? getProtectionPlanName(input.vehicle_type)
    : null;

  const bookingInsert: Record<string, unknown> = {
    booking_type: input.booking_type,
    user_id: userId,
    owner_id: bookingOwnerId ?? input.owner_id ?? null,
    vehicle_id: input.vehicle_id,
    reference_id: input.reference_id,
    amount: finalAmount,
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
    discount_amount: (input.discount_amount ?? 0) + couponDiscount,
    coupon_id: couponId,
    wallet_amount_used: walletUsed,
    rural_pickup_point_id: input.rural_pickup_point_id ?? null,
    trip_fare_amount: tripFareBase,
    security_deposit_amount: input.security_deposit_amount ?? 0,
    flexible_cancellation: protectionSelected,
    flexible_cancellation_fee: protectionFee,
    protection_selected: protectionSelected,
    protection_fee: protectionFee,
    protection_plan_name: protectionPlanName,
    protection_purchase_date: protectionSelected ? now : null,
    protection_status: protectionSelected ? "active" : null,
    cancellation_status: "active",
  };

  const { data: booking, error } = await db
    .from("bookings")
    .insert(bookingInsert)
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  if (couponId && couponDiscount > 0) {
    const { redeemCoupon } = await import("@/lib/services/coupons");
    await redeemCoupon({
      couponId,
      userId,
      bookingId: booking.id as string,
      discountAmount: couponDiscount,
    });
  }

  if (walletUsed > 0) {
    const { debitWallet } = await import("@/lib/services/wallet");
    await debitWallet({
      userId,
      amount: walletUsed,
      source: "booking",
      referenceId: booking.id as string,
      description: `Used for booking ${bookingReference}`,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/owner/dashboard");
  revalidatePath("/user/dashboard");
  revalidatePath(input.booking_type === "self_drive" ? "/search-self-drive" : "/search-driver");
  await createNotification({
    recipientId: bookingOwnerId ?? input.owner_id,
    recipientRole: "owner",
    type: "new_booking",
    title: "New booking request",
    message: `${input.passenger_name.trim()} submitted a ${input.booking_type} booking (${bookingReference}).`,
    metadata: { bookingId: booking.id, referenceId: input.reference_id, bookingType: input.booking_type },
  });

  await dispatchBookingEvent({
    event: "booking_confirmed",
    customerMobile: mobile,
    payload: { bookingReference, amount: finalAmount, bookingType: input.booking_type },
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
