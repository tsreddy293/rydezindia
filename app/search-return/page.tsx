import PageLayout from "@/components/layout/PageLayout";
import { SearchReturnClient } from "@/components/search/SearchWithMaps";
import SupabaseErrorBanner from "@/components/ui/SupabaseErrorBanner";
import { createPageMetadata } from "@/lib/metadata";
import { searchReturnJourneys } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Search Return Journeys",
  description:
    "Find return journey vehicles and available seats between Indian cities on Rydez India.",
  path: "/search-return",
});

interface Props {
  searchParams: Promise<{
    pickup?: string;
    drop?: string;
    date?: string;
    vehicleType?: string;
    fromCity?: string;
    toCity?: string;
    pickupCity?: string;
    dropCity?: string;
    pickupLat?: string;
    pickupLng?: string;
    pickupAddress?: string;
    dropLat?: string;
    dropLng?: string;
    dropAddress?: string;
  }>;
}

export default async function SearchReturnPage({ searchParams }: Props) {
  const params = await searchParams;
  const fromCity = params.fromCity ?? params.pickupCity ?? params.pickup ?? "";
  const toCity = params.toCity ?? params.dropCity ?? params.drop ?? "";
  const date = params.date ?? "";
  const vehicleType = params.vehicleType ?? "";

  const { data: results, error } = await searchReturnJourneys({
    fromCity: fromCity || undefined,
    toCity: toCity || undefined,
    date: date || undefined,
    vehicleType: vehicleType || undefined,
  });

  return (
    <PageLayout>
      {error ? (
        <div className="mx-auto max-w-7xl px-4 pt-8 md:px-6">
          <SupabaseErrorBanner message={error} />
        </div>
      ) : null}
      <SearchReturnClient
        title="Return Journey Deals"
        initialFilters={{
          fromCity,
          toCity,
          date,
          vehicleType,
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
