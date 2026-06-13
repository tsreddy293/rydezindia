import { notFound } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import BookingForm from "@/components/forms/BookingForm";
import MarketplaceBookingForm from "@/components/forms/MarketplaceBookingForm";
import {
  getDriverListingById,
  getJourneyById,
  getSelfDriveListingById,
} from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}

export default async function BookingPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { type } = await searchParams;

  if (type === "self_drive") {
    const listing = await getSelfDriveListingById(id);
    if (!listing) notFound();
    return (
      <PageLayout>
        <div className="mx-auto max-w-5xl px-4 py-12 md:px-6">
          <h1 className="text-3xl font-bold text-secondary mb-2">Book Self Drive Vehicle</h1>
          <p className="text-gray-600 mb-8">Submit your rental request below</p>
          <MarketplaceBookingForm type="self_drive" listing={listing} />
        </div>
      </PageLayout>
    );
  }

  if (type === "with_driver") {
    const listing = await getDriverListingById(id);
    if (!listing) notFound();
    return (
      <PageLayout>
        <div className="mx-auto max-w-5xl px-4 py-12 md:px-6">
          <h1 className="text-3xl font-bold text-secondary mb-2">Book Vehicle With Driver</h1>
          <p className="text-gray-600 mb-8">Submit your trip request below</p>
          <MarketplaceBookingForm type="with_driver" listing={listing} />
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
        />
      </div>
    </PageLayout>
  );
}
