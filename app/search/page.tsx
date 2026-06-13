import Link from "next/link";
import { Calendar, MapPin, Search } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import SearchResultCard from "@/components/vehicles/SearchResultCard";
import MarketplaceResultCard from "@/components/vehicles/MarketplaceResultCard";
import SupabaseErrorBanner from "@/components/ui/SupabaseErrorBanner";
import { createPageMetadata } from "@/lib/metadata";
import {
  searchDriverVehicles,
  searchReturnJourneys,
  searchSelfDriveVehicles,
} from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Search Vehicles",
  description:
    "Search return journeys, chauffeur driven vehicles, and self-drive rentals on Rydez India.",
  path: "/search",
});

const TABS = [
  { key: "return_journey", label: "Return Journey" },
  { key: "with_driver", label: "Vehicle With Driver" },
  { key: "self_drive", label: "Self Drive" },
];

const VEHICLE_TYPES = ["", "Hatchback", "Sedan", "SUV", "MUV", "Luxury", "Tempo Traveller", "Mini Bus", "Bus"];

interface Props {
  searchParams: Promise<{
    tab?: string;
    pickupCity?: string;
    dropCity?: string;
    pickup?: string;
    drop?: string;
    fromCity?: string;
    toCity?: string;
    date?: string;
    vehicleType?: string;
  }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const tab = TABS.some((item) => item.key === params.tab) ? params.tab! : "return_journey";
  const pickupCity = params.pickupCity ?? params.fromCity ?? params.pickup ?? "";
  const dropCity = params.dropCity ?? params.toCity ?? params.drop ?? "";
  const date = params.date ?? "";
  const vehicleType = params.vehicleType ?? "";

  const commonFilters = {
    pickupCity: pickupCity || undefined,
    dropCity: dropCity || undefined,
    date: date || undefined,
    vehicleType: vehicleType || undefined,
  };

  const returnResults =
    tab === "return_journey"
      ? await searchReturnJourneys({
          fromCity: pickupCity || undefined,
          toCity: dropCity || undefined,
          date: date || undefined,
          vehicleType: vehicleType || undefined,
        })
      : { data: [], error: null };

  const driverResults =
    tab === "with_driver"
      ? await searchDriverVehicles(commonFilters)
      : { data: [], error: null };

  const selfDriveResults =
    tab === "self_drive"
      ? await searchSelfDriveVehicles(commonFilters)
      : { data: [], error: null };

  const error = returnResults.error ?? driverResults.error ?? selfDriveResults.error;
  const resultCount =
    tab === "return_journey"
      ? returnResults.data.length
      : tab === "with_driver"
        ? driverResults.data.length
        : selfDriveResults.data.length;

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary">Search Vehicles</h1>
          <p className="text-gray-600 mt-1">
            {error ? "Connection error" : `${resultCount} results found`}
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          {TABS.map((item) => {
            const query = new URLSearchParams({
              tab: item.key,
              ...(pickupCity ? { pickupCity } : {}),
              ...(dropCity ? { dropCity } : {}),
              ...(date ? { date } : {}),
              ...(vehicleType ? { vehicleType } : {}),
            });
            const active = tab === item.key;
            return (
              <Link
                key={item.key}
                href={`/search?${query.toString()}`}
                className={`rounded-xl px-5 py-2.5 text-sm font-medium transition ${
                  active ? "bg-primary text-white" : "bg-white border border-gray-200 text-gray-700 hover:text-primary"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {error && <SupabaseErrorBanner message={error} />}

        <form className="rounded-2xl bg-white border shadow-sm p-5 md:p-6 mb-8">
          <input type="hidden" name="tab" value={tab} />
          <div className="flex items-center gap-2 mb-4 text-secondary font-medium">
            <Search className="h-4 w-4 text-primary" />
            Search Filters
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                  placeholder={tab === "self_drive" ? "Optional" : "Vijayawada"}
                  className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1.5">Date</span>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                <input
                  name="date"
                  type="date"
                  defaultValue={date}
                  className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
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
              <Search className="h-4 w-4" />
              Search
            </button>
          </div>
        </form>

        {!error && resultCount === 0 ? (
          <div className="text-center py-20 rounded-2xl bg-gray-50 border border-gray-100">
            <p className="text-gray-500 text-lg">No vehicles available</p>
          </div>
        ) : null}

        {!error && tab === "return_journey" && returnResults.data.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {returnResults.data.map((result) => (
              <SearchResultCard key={result.id} result={result} />
            ))}
          </div>
        ) : null}

        {!error && tab === "with_driver" && driverResults.data.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {driverResults.data.map((result) => (
              <MarketplaceResultCard key={result.id} type="with_driver" result={result} />
            ))}
          </div>
        ) : null}

        {!error && tab === "self_drive" && selfDriveResults.data.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {selfDriveResults.data.map((result) => (
              <MarketplaceResultCard key={result.id} type="self_drive" result={result} />
            ))}
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}
