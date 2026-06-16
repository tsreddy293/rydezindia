import PageLayout from "@/components/layout/PageLayout";
import { SearchLocalClient } from "@/components/search/SearchWithMaps";
import SupabaseErrorBanner from "@/components/ui/SupabaseErrorBanner";
import { createPageMetadata } from "@/lib/metadata";
import { searchDriverVehicles } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Search Local Rental Vehicles",
  description:
    "Book local rental packages with driver in Andhra Pradesh and Telangana — 4 hours, 8 hours, 12 hours, or full day.",
  path: "/search-local",
});

interface Props {
  searchParams: Promise<{
    pickupCity?: string;
    city?: string;
    date?: string;
    vehicleType?: string;
    package?: string;
    pickupLat?: string;
    pickupLng?: string;
    pickupAddress?: string;
    pickupPlaceId?: string;
  }>;
}

export default async function SearchLocalPage({ searchParams }: Props) {
  const params = await searchParams;
  const pickupCity = params.pickupCity ?? params.city ?? "";
  const date = params.date ?? "";
  const vehicleType = params.vehicleType ?? "";
  const packageKey = params.package ?? "4h_40km";

  const { data: results, error } = await searchDriverVehicles({
    pickupCity: pickupCity || undefined,
    date: date || undefined,
    vehicleType: vehicleType || undefined,
    tripType: "Local Rental",
  });

  return (
    <PageLayout>
      {error ? (
        <div className="mx-auto max-w-7xl px-4 pt-8 md:px-6">
          <SupabaseErrorBanner message={error} />
        </div>
      ) : null}
      <SearchLocalClient
        title="Local Rental Packages"
        initialFilters={{
          pickupCity,
          date,
          vehicleType,
          packageKey,
          pickupLat: params.pickupLat,
          pickupLng: params.pickupLng,
          pickupAddress: params.pickupAddress,
        }}
        results={results}
        connectionError={error}
      />
    </PageLayout>
  );
}
