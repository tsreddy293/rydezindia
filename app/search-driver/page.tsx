import PageLayout from "@/components/layout/PageLayout";
import { SearchDriverClient } from "@/components/search/SearchWithMaps";
import SupabaseErrorBanner from "@/components/ui/SupabaseErrorBanner";
import { createPageMetadata } from "@/lib/metadata";
import { searchDriverVehicles } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Search Vehicles With Driver",
  description:
    "Book vehicles with driver for local trips, outstation trips, and airport transfers on Rydez India.",
  path: "/search-driver",
});

interface Props {
  searchParams: Promise<{
    city?: string;
    pickupCity?: string;
    dropCity?: string;
    date?: string;
    tripType?: string;
    vehicleType?: string;
    cities?: string;
    pickupLat?: string;
    pickupLng?: string;
    pickupAddress?: string;
    dropLat?: string;
    dropLng?: string;
    dropAddress?: string;
  }>;
}

export default async function SearchDriverPage({ searchParams }: Props) {
  const params = await searchParams;
  const pickupCity = params.pickupCity ?? params.city ?? "";
  const dropCity = params.dropCity ?? "";
  const date = params.date ?? "";
  const tripType = params.tripType ?? "";
  const vehicleType = params.vehicleType ?? "";
  const cities = params.cities ?? "";

  const { data: results, error } = await searchDriverVehicles({
    pickupCity: pickupCity || undefined,
    dropCity: dropCity || undefined,
    date: date || undefined,
    tripType: tripType || undefined,
    vehicleType: vehicleType || undefined,
  });

  return (
    <PageLayout>
      {error ? (
        <div className="mx-auto max-w-7xl px-4 pt-8 md:px-6">
          <SupabaseErrorBanner message={error} />
        </div>
      ) : null}
      <SearchDriverClient
        title="Vehicles With Driver"
        initialFilters={{
          pickupCity,
          dropCity,
          date,
          tripType,
          vehicleType,
          cities,
          pickupLat: params.pickupLat,
          pickupLng: params.pickupLng,
          pickupAddress: params.pickupAddress,
          dropLat: params.dropLat,
          dropLng: params.dropLng,
          dropAddress: params.dropAddress,
        }}
        results={results}
        connectionError={error}
      />
    </PageLayout>
  );
}
