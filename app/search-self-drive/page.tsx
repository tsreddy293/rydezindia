import PageLayout from "@/components/layout/PageLayout";
import { SearchSelfDriveClient } from "@/components/search/SearchWithMaps";
import SelfDriveInterestTracker from "@/components/self-drive/SelfDriveInterestTracker";
import SupabaseErrorBanner from "@/components/ui/SupabaseErrorBanner";
import { createPageMetadata } from "@/lib/metadata";
import { searchSelfDriveVehicles } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Search Self Drive Vehicles",
  description:
    "Rent self-drive vehicles by city with daily rent, security deposit, photos, and availability on Rydez India.",
  path: "/search-self-drive",
});

interface Props {
  searchParams: Promise<{
    city?: string;
    pickupCity?: string;
    dropCity?: string;
    date?: string;
    time?: string;
    returnDate?: string;
    returnTime?: string;
    vehicleType?: string;
    duration?: string;
    pickupLat?: string;
    pickupLng?: string;
    pickupAddress?: string;
    dropLat?: string;
    dropLng?: string;
    dropAddress?: string;
  }>;
}

export default async function SearchSelfDrivePage({ searchParams }: Props) {
  const params = await searchParams;
  const pickupCity = params.pickupCity ?? params.city ?? "";
  const dropCity = params.dropCity ?? "";
  const date = params.date ?? "";
  const time = params.time ?? "";
  const returnDate = params.returnDate ?? "";
  const returnTime = params.returnTime ?? "";
  const vehicleType = params.vehicleType ?? "";
  const duration = params.duration ?? "";

  const { data: results, error } = await searchSelfDriveVehicles({
    pickupCity: pickupCity || undefined,
    dropCity: dropCity || undefined,
    date: date || undefined,
    vehicleType: vehicleType || undefined,
  });

  return (
    <PageLayout>
      <SelfDriveInterestTracker />
      {error ? (
        <div className="mx-auto max-w-7xl px-4 pt-8 md:px-6">
          <SupabaseErrorBanner message={error} />
        </div>
      ) : null}
      <SearchSelfDriveClient
        title="Self Drive Vehicles"
        initialFilters={{
          pickupCity,
          dropCity,
          date,
          time,
          returnDate,
          returnTime,
          vehicleType,
          duration,
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
