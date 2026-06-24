import { notFound } from "next/navigation";
import { Calendar, IndianRupee, MapPin, Shield, Users } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import Button from "@/components/ui/Button";
import CancellationPolicyCard from "@/components/booking/CancellationPolicyCard";
import { getVehicleListingById } from "@/lib/supabase/queries";
import { formatDate, formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function VehicleDetailPage({ params }: Props) {
  const { id } = await params;
  const vehicle = await getVehicleListingById(id);

  if (!vehicle) notFound();

  const isReturn = vehicle.module === "return_journey";
  const isSelfDrive = vehicle.module === "self_drive";
  const bookingType = isReturn ? "" : `?type=${vehicle.module}`;
  const route =
    vehicle.module === "return_journey"
      ? `${vehicle.from_city} → ${vehicle.to_city}`
      : vehicle.drop_city
        ? `${vehicle.pickup_city} → ${vehicle.drop_city}`
        : vehicle.pickup_city;

  const policyType = isReturn ? "return_journey" : isSelfDrive ? "self_drive" : "with_driver";

  return (
    <PageLayout>
      <div className="mx-auto max-w-5xl px-4 py-12 md:px-6">
        <div className="rounded-2xl bg-white border border-gray-100 p-6 md:p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="mb-2 text-sm font-medium text-primary">
                {isReturn ? "Return Journey" : isSelfDrive ? "Self Drive Rental" : "Vehicle With Driver"}
              </p>
              <h1 className="text-3xl font-bold text-secondary">{vehicle.vehicle_name}</h1>
              <p className="mt-2 text-gray-600">{vehicle.vehicle_type}</p>
            </div>
            <Button href={`/booking/${vehicle.id}${bookingType}`} variant="primary" size="lg">
              Book Now
            </Button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <MapPin className="mb-2 h-5 w-5 text-primary" />
              <p className="text-xs text-gray-500">Route / Location</p>
              <p className="font-semibold text-secondary">{route || "Available on request"}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <Calendar className="mb-2 h-5 w-5 text-primary" />
              <p className="text-xs text-gray-500">Date & Time</p>
              <p className="font-semibold text-secondary">
                {vehicle.journey_date ? formatDate(vehicle.journey_date) : "Flexible"}
                {vehicle.journey_time ? `, ${vehicle.journey_time}` : ""}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <Users className="mb-2 h-5 w-5 text-primary" />
              <p className="text-xs text-gray-500">Seats</p>
              <p className="font-semibold text-secondary">{vehicle.available_seats || 1}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <IndianRupee className="mb-2 h-5 w-5 text-primary" />
              <p className="text-xs text-gray-500">Price</p>
              <p className="font-semibold text-primary">
                {formatINR(vehicle.price)} / {vehicle.price_label}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-gray-100 p-5">
            <p className="flex items-center gap-2 font-semibold text-secondary">
              <Shield className="h-4 w-4 text-primary" />
              Verified Rydez India Listing
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Booking requests are confirmed after owner availability and passenger details are verified.
            </p>
          </div>

          <div className="mt-6">
            <CancellationPolicyCard bookingType={policyType} />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
