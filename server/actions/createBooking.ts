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
import { shouldRequireBookingOtp } from "@/lib/booking/booking-mobile-verification";
import { assertAuthenticatedRiderForBooking } from "@/lib/auth/customer-auth";
import { markSelfDriveInterest } from "@/lib/services/customer-profile";
import { bookReturnJourneySeats, initializeReturnJourneySeats } from "@/lib/services/return-journey-seats";
import { dispatchBookingEvent } from "@/lib/services/messaging";
import { getProtectionFeeForVehicle } from "@/lib/services/flexible-cancellation-protection";
import { applyBookingInsertWithColumnFallback } from "@/lib/bookings/apply-booking-insert";
import { appendSelfDrivePaymentMarker } from "@/lib/bookings/self-drive-payment";
import { appendProtectionToInstructions } from "@/lib/bookings/protection-instructions";
import {
  calculateSelfDrivePaymentWorkflow,
  resolveSelfDriveBookingDeposit,
} from "@/lib/pricing/self-drive-payment-workflow";
import { findResumablePendingBooking } from "@/lib/bookings/duplicate-booking";
import { calculateLocalRentalPricing } from "@/lib/pricing/local-rental-pricing";
import {
  calculateReturnJourneyPricingFromListing,
  resolveReturnJourneyPricePerSeat,
} from "@/lib/pricing/return-journey-pricing";
import type { ActionResult, CreateBookingInput, CreateMarketplaceBookingInput } from "@/types/database";

const MOBILE_REGEX = /^[6-9]\d{9}$/;

async function decrementReturnJourneySeatsAtomic(
  db: ReturnType<typeof createAdminClient>,
  journeyId: string,
  seats: number
): Promise<{ ok: true; remaining: number } | { ok: false; error: string }> {
  const { data, error } = await db.rpc("decrement_return_journey_seats", {
    p_journey_id: journeyId,
    p_seats: seats,
  });

  if (!error) {
    return { ok: true, remaining: Number(data ?? 0) };
  }

  const msg = error.message ?? "";
  if (!msg.includes("Could not find the function") && !msg.includes("schema cache")) {
    return { ok: false, error: msg.includes("Not enough") ? "Not enough seats available" : msg };
  }

  const { data: row } = await db
    .from("return_journeys")
    .select("available_seats")
    .eq("id", journeyId)
    .maybeSingle();

  const available = Number((row as { available_seats?: number } | null)?.available_seats ?? 0);
  if (available < seats) {
    return { ok: false, error: `Only ${available} seats available` };
  }

  const remaining = available - seats;
  const { error: updateError } = await db
    .from("return_journeys")
    .update({
      available_seats: remaining,
      status: remaining <= 0 ? "booked" : "available",
    })
    .eq("id", journeyId)
    .gte("available_seats", seats);

  if (updateError) return { ok: false, error: updateError.message };
  return { ok: true, remaining };
}

async function restoreReturnJourneySeatsAtomic(
  db: ReturnType<typeof createAdminClient>,
  journeyId: string,
  seats: number
) {
  const { error } = await db.rpc("restore_return_journey_seats", {
    p_journey_id: journeyId,
    p_seats: seats,
  });
  if (!error) return;

  const { data: row } = await db
    .from("return_journeys")
    .select("available_seats")
    .eq("id", journeyId)
    .maybeSingle();
  const available = Number((row as { available_seats?: number } | null)?.available_seats ?? 0);
  await db
    .from("return_journeys")
    .update({ available_seats: available + seats, status: "available" })
    .eq("id", journeyId);
}

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
  const pricePerSeat = resolveReturnJourneyPricePerSeat(journey);
  const ownerId = String(
    (journey.owner as { id?: string } | null)?.id ?? journey.owner_id
  );

  if (availableSeats < input.seats_booked) {
    return { success: false, error: `Only ${availableSeats} seats available` };
  }

  const mobile = input.mobile.replace(/\s/g, "");

  const authResult = await assertAuthenticatedRiderForBooking();
  if (!authResult.success || !authResult.data) {
    return {
      success: false,
      error: authResult.error ?? "Please sign in to continue your booking.",
    };
  }

  const loggedInRider = authResult.data;
  if (shouldRequireBookingOtp({ loggedInUserId: loggedInRider.user.id })) {
    const otpError = await assertRecentBookingOtp(mobile);
    if (otpError) return { success: false, error: otpError };
  }

  const ownerKycError = await assertOwnerCanReceiveBookings(
    ownerId,
    journey.vehicle_id ? String(journey.vehicle_id) : undefined
  );
  if (ownerKycError) return { success: false, error: ownerKycError };

  const db = createAdminClient();

  const userId = loggedInRider.user.id;

  const resumable = await findResumablePendingBooking({
    userId,
    referenceId: input.ride_id,
    pickupDate: String(journey.journey_date ?? ""),
    bookingType: "return_journey",
  });
  if (resumable?.id) {
    return { success: true, data: { id: resumable.id } };
  }

  const pricing = calculateReturnJourneyPricingFromListing(
    {
      price: Number(journey.price ?? 0) || undefined,
      price_per_seat: Number(journey.price_per_seat ?? pricePerSeat),
      discount_percent: (journey as { discount_percent?: number }).discount_percent,
    },
    input.seats_booked
  );

  await initializeReturnJourneySeats(input.ride_id, availableSeats);

  const seatHold = await decrementReturnJourneySeatsAtomic(db, input.ride_id, input.seats_booked);
  if (!seatHold.ok) {
    return { success: false, error: seatHold.error };
  }

  const amount = pricing.totalFare;
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
    base_fare: pricing.subtotal,
    platform_fee: Math.round(amount * 0.05),
    discount_amount: pricing.discountAmount + (input.discount_amount ?? 0),
    trip_fare_amount: amount,
  };

  const { data: booking, error: bookingError } = await applyBookingInsertWithColumnFallback(
    db,
    bookingPayload
  );

  if (bookingError || !booking) {
    await restoreReturnJourneySeatsAtomic(db, input.ride_id, input.seats_booked);
    return { success: false, error: bookingError ?? "Booking insert failed" };
  }

  const seatNumbers = input.seat_numbers?.length
    ? input.seat_numbers
    : Array.from({ length: input.seats_booked }, (_, i) => i + 1);

  try {
    await bookReturnJourneySeats({
      returnJourneyId: input.ride_id,
      seatNumbers,
      bookingId: booking.id as string,
      updateJourneyInventory: false,
    });
  } catch (seatError) {
    await db.from("bookings").delete().eq("id", booking.id);
    await restoreReturnJourneySeatsAtomic(db, input.ride_id, input.seats_booked);
    return {
      success: false,
      error: seatError instanceof Error ? seatError.message : "Seat assignment failed",
    };
  }

  await db.from("bookings").update({ seat_numbers: seatNumbers }).eq("id", booking.id);

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/admin");
  await createNotification({
    recipientId: ownerId,
    recipientRole: "owner",
    type: "new_booking",
    title: "New booking request",
    message: `${input.passenger_name.trim()} requested ${input.seats_booked} seat(s).`,
    metadata: { bookingId: booking.id, rideId: input.ride_id },
  });

  await dispatchBookingEvent({
    event: "booking_confirmed",
    customerMobile: mobile,
    payload: { bookingReference, seats: input.seats_booked, amount },
  });

  return { success: true, data: { id: booking.id as string } };
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
    protection_selected?: boolean;
    protection_fee?: number;
    vehicle_type?: string;
    trip_fare_amount?: number;
    security_deposit_amount?: number;
    local_rental_package?: string;
    extra_hours?: number;
    extra_km?: number;
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

  const authResult = await assertAuthenticatedRiderForBooking();
  if (!authResult.success || !authResult.data) {
    return {
      success: false,
      error: authResult.error ?? "Please sign in to continue your booking.",
    };
  }

  const loggedInRider = authResult.data;

  if (shouldRequireBookingOtp({ loggedInUserId: loggedInRider.user.id })) {
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

  const userId = loggedInRider.user.id;

  if (input.booking_type === "self_drive") {
    await markSelfDriveInterest(userId);
    const kycError = await assertCustomerCanBookSelfDrive(userId);
    if (kycError) return { success: false, error: kycError };
  }

  const resumable = await findResumablePendingBooking({
    userId,
    vehicleId: input.vehicle_id,
    referenceId: input.reference_id,
    pickupDate: input.pickup_date ?? null,
    bookingType: input.booking_type,
  });
  if (resumable?.id) {
    return {
      success: true,
      data: {
        id: resumable.id,
        bookingReference: resumable.booking_reference ?? resumable.id.slice(0, 8).toUpperCase(),
      },
    };
  }

  const isSelfDriveBooking = input.booking_type === "self_drive";
  const isLocalRental = String(input.trip_type ?? "").toLowerCase() === "local rental";
  let resolvedAmount = input.amount;
  let resolvedBaseFare = input.base_fare ?? input.amount;
  let resolvedPlatformFee = input.platform_fee ?? Math.round(input.amount * 0.05);

  if (isLocalRental && input.local_rental_package) {
    const localPricing = calculateLocalRentalPricing({
      packageKey: input.local_rental_package,
      extraHours: input.extra_hours,
      extraKm: input.extra_km,
      vehicleType: input.vehicle_type,
    });
    resolvedAmount = localPricing.totalFare;
    resolvedBaseFare = localPricing.adjustedBasePrice + localPricing.extraHourCharge + localPricing.extraKmCharge;
    resolvedPlatformFee = localPricing.platformFee;
  }

  const protectionSelected = Boolean(input.protection_selected);
  const protectionFee = protectionSelected
    ? input.protection_fee ?? getProtectionFeeForVehicle(input.vehicle_type)
    : 0;
  const tripFareBase = input.trip_fare_amount ?? resolvedAmount;
  let finalAmount = resolvedAmount;
  let couponDiscount = 0;
  let couponId: string | null = null;

  let selfDriveWorkflow: ReturnType<typeof calculateSelfDrivePaymentWorkflow> | null = null;
  let tripFareForBooking = tripFareBase;

  if (isSelfDriveBooking) {
    const deposit = resolveSelfDriveBookingDeposit({
      security_deposit: input.security_deposit_amount,
      vehicle_type: input.vehicle_type,
    });
    selfDriveWorkflow = calculateSelfDrivePaymentWorkflow({
      tripFare: tripFareBase,
      securityDeposit: deposit,
      protectionFee: 0,
    });
    tripFareForBooking = selfDriveWorkflow.tripFare;
    finalAmount = selfDriveWorkflow.amountPayableNow;
  }

  if (input.coupon_code?.trim()) {
    const { validateCoupon } = await import("@/lib/services/coupons");
    const couponOrderAmount = isSelfDriveBooking && selfDriveWorkflow
      ? selfDriveWorkflow.amountPayableNow
      : resolvedAmount;
    const couponResult = await validateCoupon({
      code: input.coupon_code,
      userId,
      orderAmount: couponOrderAmount,
    });
    if (!couponResult.valid) {
      return { success: false, error: couponResult.error ?? "Invalid coupon" };
    }
    couponDiscount = couponResult.discountAmount;
    couponId = couponResult.couponId ?? null;
    if (!isSelfDriveBooking) {
      finalAmount = Math.max(0, resolvedAmount - couponDiscount);
    }
  }

  let walletUsed = 0;
  if (input.wallet_amount_used && input.wallet_amount_used > 0) {
    const { getWalletBalance } = await import("@/lib/services/wallet");
    const balance = await getWalletBalance(userId);
    const walletCap = isSelfDriveBooking && selfDriveWorkflow
      ? selfDriveWorkflow.amountPayableNow - couponDiscount
      : finalAmount;
    walletUsed = Math.min(balance, input.wallet_amount_used, walletCap);
  }

  if (isSelfDriveBooking && selfDriveWorkflow) {
    selfDriveWorkflow = calculateSelfDrivePaymentWorkflow({
      tripFare: tripFareForBooking,
      securityDeposit: selfDriveWorkflow.securityDeposit,
      protectionFee,
    });
    finalAmount = Math.max(
      0,
      selfDriveWorkflow.amountPayableNow - couponDiscount - walletUsed
    );
  } else {
    finalAmount = Math.max(0, finalAmount - walletUsed + protectionFee);
  }

  const instructionsWithProtection = protectionSelected
    ? appendProtectionToInstructions(input.special_instructions ?? null, protectionFee)
    : input.special_instructions ?? null;

  let instructionsFinal = instructionsWithProtection;
  if (isSelfDriveBooking && selfDriveWorkflow) {
    instructionsFinal = appendSelfDrivePaymentMarker(instructionsWithProtection, {
      tripFare: selfDriveWorkflow.tripFare,
      advanceAmount: selfDriveWorkflow.advanceAmount,
      balanceAmount: selfDriveWorkflow.balanceAmount,
      securityDeposit: selfDriveWorkflow.securityDeposit,
      amountPaid: 0,
      amountDue: selfDriveWorkflow.balanceAmount,
      depositRefundAmount: 0,
      depositRefundStatus: "none",
    });
  }

  if (walletUsed > 0) {
    const { debitWallet } = await import("@/lib/services/wallet");
    try {
      await debitWallet({
        userId,
        amount: walletUsed,
        source: "booking",
        referenceId: bookingReference,
        description: `Reserved for booking ${bookingReference}`,
      });
    } catch (walletError) {
      return {
        success: false,
        error: walletError instanceof Error ? walletError.message : "Insufficient wallet balance",
      };
    }
  }

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
    special_instructions: instructionsFinal,
    base_fare: resolvedBaseFare,
    platform_fee: resolvedPlatformFee,
    discount_amount: (input.discount_amount ?? 0) + couponDiscount,
    coupon_id: couponId,
    wallet_amount_used: walletUsed,
    rural_pickup_point_id: input.rural_pickup_point_id ?? null,
    trip_fare_amount: isSelfDriveBooking && selfDriveWorkflow ? selfDriveWorkflow.tripFare : tripFareBase,
    security_deposit_amount:
      isSelfDriveBooking && selfDriveWorkflow
        ? selfDriveWorkflow.securityDeposit
        : input.security_deposit_amount ?? 0,
    ...(isSelfDriveBooking && selfDriveWorkflow
      ? {
          advance_amount: selfDriveWorkflow.advanceAmount,
          balance_amount: selfDriveWorkflow.balanceAmount,
          amount_paid: 0,
          amount_due: selfDriveWorkflow.balanceAmount,
          deposit_refund_status: "none",
        }
      : {}),
  };

  const { data: booking, error } = await applyBookingInsertWithColumnFallback(db, bookingInsert);

  if (error || !booking) {
    if (walletUsed > 0) {
      const { creditWallet } = await import("@/lib/services/wallet");
      await creditWallet({
        userId,
        amount: walletUsed,
        source: "booking_rollback",
        referenceId: bookingReference,
        description: `Wallet restored — booking failed (${bookingReference})`,
      });
    }
    return { success: false, error: error ?? "Booking insert failed" };
  }

  if (couponId && couponDiscount > 0) {
    const { redeemCoupon } = await import("@/lib/services/coupons");
    await redeemCoupon({
      couponId,
      userId,
      bookingId: booking.id as string,
      discountAmount: couponDiscount,
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
