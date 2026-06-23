import { notFound, redirect } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import BookingForm from "@/components/forms/BookingForm";
import UnifiedBookingForm from "@/components/forms/UnifiedBookingForm";
import SelfDriveBookingForm from "@/components/booking/SelfDriveBookingForm";
import {
  getDriverListingById,
  getJourneyById,
  getSelfDriveListingById,
} from "@/lib/supabase/queries";
import { getReturnJourneySeats } from "@/lib/services/return-journey-seats";
import { checkSelfDriveKycGate } from "@/lib/kyc/self-drive-gate";
import { requireRiderForBooking } from "@/lib/auth/customer-auth";
import { recordSelfDriveInterestForUser } from "@/server/actions/selfDrive";
import { selfDriveKycPath } from "@/lib/kyc/self-drive-nav";
import {
  buildBookingReturnPath,
  type BookingPageSearchParams,
} from "@/lib/booking/booking-return-path";
import { parseSelfDriveBookingSearchParams } from "@/lib/booking/self-drive-booking-url";
import { getRiderBookingProfile } from "@/lib/users/rider-profile";
import {
  fetchOwnerApprovalState,
  resolveBookingOwnerContext,
} from "@/lib/services/owner-approval-sync";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<BookingPageSearchParams>;
}

async function resolveBookingType(
  id: string,
  typeParam: string | undefined
): Promise<"self_drive" | "with_driver" | "return_journey" | null> {
  if (typeParam === "self_drive") {
    return (await getSelfDriveListingById(id)) ? "self_drive" : null;
  }
  if (typeParam === "with_driver") {
    return (await getDriverListingById(id)) ? "with_driver" : null;
  }
  if (typeParam === "return_journey") {
    return (await getJourneyById(id)) ? "return_journey" : null;
  }

  const selfDrive = await getSelfDriveListingById(id);
  if (selfDrive) return "self_drive";

  const driver = await getDriverListingById(id);
  if (driver) return "with_driver";

  const journey = await getJourneyById(id);
  if (journey) return "return_journey";

  return null;
}

export default async function BookingPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const returnPath = buildBookingReturnPath(id, sp);

  const { user } = await requireRiderForBooking(returnPath);

  const bookingType = await resolveBookingType(id, sp.type);
  if (!bookingType) notFound();

  if (bookingType === "self_drive") {
    const listing = await getSelfDriveListingById(id);
    if (!listing) notFound();

    await recordSelfDriveInterestForUser(user.id);
    const gate = await checkSelfDriveKycGate(user.id);

    if (!gate.allowed) {
      redirect(selfDriveKycPath(returnPath));
    }

    const customer = await getRiderBookingProfile(user.id, {
      email: user.email,
      name: String(user.user_metadata?.name ?? ""),
      mobile: String(user.user_metadata?.mobile ?? ""),
    });

    const searchPrefill = parseSelfDriveBookingSearchParams(sp);

    const ownerCtx = await resolveBookingOwnerContext({
      vehicleId: listing.vehicle_id ?? id,
      ownerIdHint: listing.owner_id,
    });
    const approval = ownerCtx.canonicalOwnerId
      ? await fetchOwnerApprovalState(ownerCtx.canonicalOwnerId)
      : null;

    console.log("Vehicle ID:", listing.vehicle_id ?? id);
    console.log("Owner ID:", ownerCtx.rawOwnerId || listing.owner_id || "—");
    console.log("Canonical Owner ID:", ownerCtx.canonicalOwnerId || "—");
    console.log("Owner Status:", approval?.ownerStatus ?? "—");
    console.log("[booking page] owner approval sources", {
      profile: approval?.profileOwnerStatus,
      users: approval?.usersOwnerStatus,
      vehicle_owners: approval?.vehicleOwnersStatus,
      owners: approval?.ownersVerificationStatus,
      kyc: approval?.kycStatus,
    });

    return (
      <PageLayout>
        <div className="mx-auto max-w-5xl px-4 py-12 md:px-6">
          <h1 className="text-3xl font-bold text-secondary mb-2">Book Self Drive Vehicle</h1>
          <p className="text-gray-600 mb-8">Review your trip details and confirm your booking</p>
          <SelfDriveBookingForm
            listing={listing}
            customer={customer}
            searchPrefill={searchPrefill}
          />
        </div>
      </PageLayout>
    );
  }

  if (bookingType === "with_driver") {
    const listing = await getDriverListingById(id);
    if (!listing) notFound();

    const customerPrefill = await getRiderBookingProfile(user.id, {
      email: user.email,
      name: String(user.user_metadata?.name ?? ""),
      mobile: String(user.user_metadata?.mobile ?? ""),
    });

    return (
      <PageLayout>
        <div className="mx-auto max-w-5xl px-4 py-12 md:px-6">
          <h1 className="text-3xl font-bold text-secondary mb-2">Book Vehicle With Driver</h1>
          <p className="text-gray-600 mb-8">Submit your trip request below</p>
          <UnifiedBookingForm type="with_driver" listing={listing} customerPrefill={customerPrefill} />
        </div>
      </PageLayout>
    );
  }

  let journey: Awaited<ReturnType<typeof getJourneyById>> = null;

  try {
    journey = await getJourneyById(id);
  } catch (err) {
    console.error("Failed to load journey:", err);
  }

  if (!journey) notFound();

  const vehicle = journey.vehicle as {
    vehicle_model?: string;
    vehicle_type?: string;
    vehicle_number?: string;
  } | null;
  const owner = journey.owner as { name?: string } | null;
  const seats = await getReturnJourneySeats(String(journey.id));

  return (
    <PageLayout>
      <div className="mx-auto max-w-5xl px-4 py-12 md:px-6">
        <h1 className="text-3xl font-bold text-secondary mb-2">Book Your Ride</h1>
        <p className="text-gray-600 mb-8">Complete your booking details below</p>
        <BookingForm
          journey={{
            id: String(journey.id),
            from_city: String(journey.from_city),
            to_city: String(journey.to_city),
            journey_date: String(journey.journey_date),
            available_seats: Number(journey.available_seats),
            price_per_seat: Number(journey.price_per_seat),
            vehicle: vehicle
              ? {
                  vehicle_name: vehicle.vehicle_model ?? vehicle.vehicle_number ?? "Vehicle",
                  vehicle_type: vehicle.vehicle_type ?? "—",
                }
              : null,
            owner: owner ? { name: owner.name ?? "Owner" } : null,
          }}
          seats={seats.map((s) => ({
            seat_number: Number((s as { seat_number: number }).seat_number),
            status: String((s as { status: string }).status),
          }))}
        />
      </div>
    </PageLayout>
  );
}
