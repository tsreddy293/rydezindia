import { notFound, redirect } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import BookingForm from "@/components/forms/BookingForm";
import UnifiedBookingForm from "@/components/forms/UnifiedBookingForm";
import SelfDriveKycGate from "@/components/booking/SelfDriveKycGate";
import {
  getDriverListingById,
  getJourneyById,
  getSelfDriveListingById,
} from "@/lib/supabase/queries";
import { getReturnJourneySeats } from "@/lib/services/return-journey-seats";
import { checkSelfDriveKycGate } from "@/lib/kyc/self-drive-gate";
import { getOptionalRiderUser } from "@/server/actions/auth";
import { recordSelfDriveInterestForUser } from "@/server/actions/selfDrive";
import { selfDriveAuthLoginPath, selfDriveKycPath } from "@/lib/kyc/self-drive-nav";
import { getRiderBookingProfile } from "@/lib/users/rider-profile";

async function resolveCustomerPrefill() {
  const rider = await getOptionalRiderUser();
  if (!rider) return null;
  return getRiderBookingProfile(rider.user.id, {
    email: rider.user.email,
    name: String(rider.user.user_metadata?.name ?? ""),
    mobile: String(rider.user.user_metadata?.mobile ?? ""),
  });
}

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}

export default async function BookingPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { type } = await searchParams;
  const returnPath = `/booking/${id}?type=${type ?? "with_driver"}`;

  if (type === "self_drive") {
    const listing = await getSelfDriveListingById(id);
    if (!listing) notFound();

    const rider = await getOptionalRiderUser();
    const customerPrefill = rider ? await resolveCustomerPrefill() : null;

    if (!rider) {
      redirect(selfDriveAuthLoginPath(returnPath));
    }

    await recordSelfDriveInterestForUser(rider.user.id);
    const gate = await checkSelfDriveKycGate(rider.user.id);

    if (!gate.allowed) {
      if (gate.status === "not_submitted" || gate.status === "rejected") {
        redirect(selfDriveKycPath(returnPath));
      }

      return (
        <PageLayout>
          <div className="mx-auto max-w-5xl px-4 py-12 md:px-6">
            <h1 className="text-3xl font-bold text-secondary mb-2">Book Self Drive Vehicle</h1>
            <p className="text-gray-600 mb-8">Complete verification to continue your booking</p>
            <SelfDriveKycGate gate={gate} returnPath={returnPath} />
          </div>
        </PageLayout>
      );
    }

    return (
      <PageLayout>
        <div className="mx-auto max-w-5xl px-4 py-12 md:px-6">
          <h1 className="text-3xl font-bold text-secondary mb-2">Book Self Drive Vehicle</h1>
          <p className="text-gray-600 mb-8">Submit your rental request below</p>
          <UnifiedBookingForm type="self_drive" listing={listing} customerPrefill={customerPrefill} />
        </div>
      </PageLayout>
    );
  }

  if (type === "with_driver") {
    const listing = await getDriverListingById(id);
    if (!listing) notFound();
    const customerPrefill = await resolveCustomerPrefill();
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

  if (!journey) {
    notFound();
  }

  const vehicle = journey.vehicle as { vehicle_model?: string; vehicle_type?: string; vehicle_number?: string } | null;
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
