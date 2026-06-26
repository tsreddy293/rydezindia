import ReturnJourneyDealCard from "@/components/return-journey/ReturnJourneyDealCard";
import RouteMatchBanner from "@/components/return-journey/RouteMatchBanner";
import ReturnJourneyListingForm from "@/components/forms/ReturnJourneyListingForm";
import { getReturnJourneyMarketplace } from "@/lib/supabase/queries";
import { scoreRouteMatch } from "@/lib/services/route-matching";
import { vehicleDisplayName, type OwnerVehicleRow } from "@/lib/vehicles/format";

interface Props {
  from?: string;
  to?: string;
  date?: string;
  ownerVehicles?: OwnerVehicleRow[];
  variant?: "public" | "owner";
}

export default async function ReturnJourneyMarketplaceContent({
  from,
  to,
  date,
  ownerVehicles = [],
  variant = "public",
}: Props) {
  const { data: journeys, error } = await getReturnJourneyMarketplace({ from, to, date });

  const matchCount =
    from && to
      ? journeys.filter((j) =>
          scoreRouteMatch({
            searchFrom: from,
            searchTo: to,
            listingFrom: j.from_city,
            listingTo: j.to_city,
          }) >= 50
        ).length
      : 0;

  const approvedVehicles = ownerVehicles.filter((v) => v.approval_status === "approved");
  const showListingForm = approvedVehicles.length > 0;

  return (
    <>
      {variant === "public" && (
        <div className="mb-10 text-center">
          <span className="mb-4 inline-block rounded-full bg-orange-100 px-4 py-1 text-sm font-semibold text-orange-700">
            Return Journey Deal — Save Up To 40%
          </span>
          <h1 className="text-3xl font-bold text-secondary md:text-4xl">Return Journey Marketplace</h1>
          <p className="mx-auto mt-2 max-w-2xl text-gray-600">
            Owners offer discounted return seats after completing outbound trips. Book smart, travel cheaper.
          </p>
        </div>
      )}

      {from && to && <RouteMatchBanner fromCity={from} toCity={to} matchCount={matchCount} />}

      {showListingForm && (
        <div className="mb-10">
          <ReturnJourneyListingForm
            vehicles={approvedVehicles.map((v) => ({
              id: v.id,
              vehicle_name: vehicleDisplayName(v),
              vehicle_type: v.vehicle_category,
            }))}
          />
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>
      )}

      {journeys.length === 0 ? (
        <div className="rounded-2xl bg-gray-50 py-20 text-center text-gray-500">
          No return journeys available. Try adjusting your route filters.
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {journeys.map((journey) => (
            <ReturnJourneyDealCard key={journey.id} journey={journey} />
          ))}
        </div>
      )}
    </>
  );
}
