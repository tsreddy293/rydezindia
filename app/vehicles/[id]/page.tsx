import { notFound } from "next/navigation";
import { MapPin, Users, Calendar, Car, Shield, IndianRupee } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import Button from "@/components/ui/Button";
import { getJourneyById } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

type JourneyDetail = {
  id: string;
  from_city: string;
  to_city: string;
  journey_date: string;
  available_seats: number;
  price_per_seat: number;
  status: string;
  vehicle: { vehicle_type?: string; vehicle_number?: string; vehicle_model?: string } | null;
  owner: { name?: string } | null;
};

function first<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null;
  return Array.isArray(val) ? val[0] ?? null : val;
}

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await getJourneyById(id);
  if (!raw) notFound();

  const journey = raw as unknown as JourneyDetail;
  const vehicle = first(journey.vehicle);
  const owner = first(journey.owner);

  const vehicleName = vehicle?.vehicle_model || vehicle?.vehicle_number || "Vehicle";

  return (
    <PageLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-secondary">{vehicleName}</h1>
            <p className="flex items-center gap-1 text-gray-500 mt-1">
              <MapPin className="h-4 w-4" /> {journey.from_city} → {journey.to_city}
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary capitalize">
            {journey.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
          {[
            { icon: Car, label: "Vehicle Type", value: vehicle?.vehicle_type || "—" },
            { icon: Calendar, label: "Journey Date", value: journey.journey_date },
            { icon: Users, label: "Available Seats", value: String(journey.available_seats) },
            { icon: IndianRupee, label: "Price / Seat", value: `₹${Number(journey.price_per_seat).toLocaleString()}` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl bg-gray-50 p-4">
              <Icon className="h-5 w-5 text-primary mb-2" />
              <p className="text-xs text-gray-500">{label}</p>
              <p className="font-semibold text-secondary">{value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-100 p-6 mb-6">
          <p className="font-semibold text-secondary flex items-center gap-2">
            {owner?.name || "Verified Owner"}
            <Shield className="h-4 w-4 text-primary" />
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Vehicle No: {vehicle?.vehicle_number || "—"}
          </p>
        </div>

        <Button href={`/booking/${journey.id}`} variant="primary" size="lg" className="w-full">
          Book Now
        </Button>
      </div>
    </PageLayout>
  );
}
