import PageLayout from "@/components/layout/PageLayout";
import SearchPageClient from "@/components/search/SearchPageClient";
import SupabaseErrorBanner from "@/components/ui/SupabaseErrorBanner";
import { searchVehicles } from "@/lib/supabase/queries";
import { createPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Search Vehicles",
  description:
    "Search available vehicles and return journeys across India. Filter by city, date, and vehicle type on Rydez India.",
  path: "/search",
});

interface Props {
  searchParams: Promise<{
    pickup?: string;
    drop?: string;
    date?: string;
    vehicleType?: string;
    fromCity?: string;
    toCity?: string;
  }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;

  const fromCity = params.fromCity ?? params.pickup ?? "";
  const toCity = params.toCity ?? params.drop ?? "";
  const date = params.date ?? "";
  const vehicleType = params.vehicleType ?? "";

  const { data: results, error } = await searchVehicles({
    fromCity: fromCity || undefined,
    toCity: toCity || undefined,
    date: date || undefined,
    vehicleType: vehicleType || undefined,
  });

  return (
    <PageLayout>
      {error && (
        <div className="mx-auto max-w-7xl px-4 pt-8 md:px-6">
          <SupabaseErrorBanner message={error} />
        </div>
      )}
      <SearchPageClient
        initialResults={results}
        initialFilters={{ fromCity, toCity, date, vehicleType }}
        connectionError={error}
      />
    </PageLayout>
  );
}
