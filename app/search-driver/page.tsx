import { Car, MapPin, Search } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import SupabaseErrorBanner from "@/components/ui/SupabaseErrorBanner";
import MarketplaceResultCard from "@/components/vehicles/MarketplaceResultCard";
import { createPageMetadata } from "@/lib/metadata";
import { searchDriverVehicles } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Search Vehicles With Driver",
  description:
    "Book vehicles with driver for local trips, outstation trips, and airport transfers on Rydez India.",
  path: "/search-driver",
});

const VEHICLE_TYPES = ["", "Hatchback", "Sedan", "SUV", "MUV", "Luxury", "Tempo Traveller", "Mini Bus", "Bus"];
const TRIP_TYPES = ["", "Local Trip", "Outstation Trip", "Airport Transfer"];

interface Props {
  searchParams: Promise<{ city?: string; pickupCity?: string; dropCity?: string; date?: string; tripType?: string; vehicleType?: string }>;
}

export default async function SearchDriverPage({ searchParams }: Props) {
  const params = await searchParams;
  const pickupCity = params.pickupCity ?? params.city ?? "";
  const dropCity = params.dropCity ?? "";
  const date = params.date ?? "";
  const tripType = params.tripType ?? "";
  const vehicleType = params.vehicleType ?? "";

  const { data: results, error } = await searchDriverVehicles({
    pickupCity: pickupCity || undefined,
    dropCity: dropCity || undefined,
    date: date || undefined,
    tripType: tripType || undefined,
    vehicleType: vehicleType || undefined,
  });

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary">Vehicles With Driver</h1>
          <p className="text-gray-600 mt-1">
            {error ? "Connection error" : `${results.length} results found`}
          </p>
        </div>

        {error && <SupabaseErrorBanner message={error} />}

        <form className="rounded-2xl bg-white border shadow-sm p-5 md:p-6 mb-8">
          <div className="flex items-center gap-2 mb-4 text-secondary font-medium">
            <Search className="h-4 w-4 text-primary" />
            Search Filters
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1.5">Pickup City</span>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                <input
                  name="pickupCity"
                  defaultValue={pickupCity}
                  placeholder="Hyderabad"
                  className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1.5">Drop City</span>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                <input
                  name="dropCity"
                  defaultValue={dropCity}
                  placeholder="Vijayawada"
                  className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1.5">Date</span>
              <input
                name="date"
                type="date"
                defaultValue={date}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1.5">Trip Type</span>
              <select
                name="tripType"
                defaultValue={tripType}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              >
                {TRIP_TYPES.map((type) => (
                  <option key={type || "all"} value={type}>
                    {type || "All Trips"}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle Type</span>
              <select
                name="vehicleType"
                defaultValue={vehicleType}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              >
                {VEHICLE_TYPES.map((type) => (
                  <option key={type || "all"} value={type}>
                    {type || "All Types"}
                  </option>
                ))}
              </select>
            </label>
            <button className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-dark">
              <Car className="h-4 w-4" />
              Search
            </button>
          </div>
        </form>

        {!error && results.length === 0 ? (
          <div className="text-center py-20 rounded-2xl bg-gray-50 border border-gray-100">
            <p className="text-gray-500 text-lg">No vehicles available</p>
          </div>
        ) : !error ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((result) => (
              <MarketplaceResultCard key={result.id} type="with_driver" result={result} />
            ))}
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}
