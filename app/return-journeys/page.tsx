import PageLayout from "@/components/layout/PageLayout";
import ReturnJourneyDealCard from "@/components/return-journey/ReturnJourneyDealCard";
import RouteMatchBanner from "@/components/return-journey/RouteMatchBanner";
import ReturnJourneyListingForm from "@/components/forms/ReturnJourneyListingForm";
import { getReturnJourneyMarketplace } from "@/lib/supabase/queries";
import { scoreRouteMatch } from "@/lib/services/route-matching";
import { createPageMetadata } from "@/lib/metadata";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/server/actions/auth";
import { getOwnerVehiclesList } from "@/server/actions/vehicles";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Return Journey Marketplace",
  description: "Find return journey deals and save up to 40% on intercity travel with Rydez India.",
  path: "/return-journeys",
});

interface Props {
  searchParams: Promise<{ from?: string; to?: string; date?: string }>;
}

export default async function ReturnJourneysPage({ searchParams }: Props) {
  const params = await searchParams;
  const { data: journeys, error } = await getReturnJourneyMarketplace({
    from: params.from,
    to: params.to,
    date: params.date,
  });

  let ownerVehicles: Awaited<ReturnType<typeof getOwnerVehiclesList>> = [];
  let isOwner = false;
  const role = await getCurrentUserRole();
  if (role === "owner") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      isOwner = true;
      ownerVehicles = await getOwnerVehiclesList(data.user.id);
    }
  }

  const matchCount =
    params.from && params.to
      ? journeys.filter((j) =>
          scoreRouteMatch({
            searchFrom: params.from!,
            searchTo: params.to!,
            listingFrom: j.from_city,
            listingTo: j.to_city,
          }) >= 50
        ).length
      : 0;

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="mb-10 text-center">
          <span className="inline-block rounded-full bg-orange-100 px-4 py-1 text-sm font-semibold text-orange-700 mb-4">
            🔥 Return Journey Deal — Save Up To 40%
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-secondary">Return Journey Marketplace</h1>
          <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
            Owners offer discounted return seats after completing outbound trips. Book smart, travel cheaper.
          </p>
        </div>

        {params.from && params.to && (
          <RouteMatchBanner fromCity={params.from} toCity={params.to} matchCount={matchCount} />
        )}

        {isOwner && ownerVehicles.length > 0 && (
          <div className="mb-10">
            <ReturnJourneyListingForm vehicles={ownerVehicles as { id: string; vehicle_name: string; vehicle_type: string }[]} />
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-600 mb-6">{error}</div>
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
      </div>
    </PageLayout>
  );
}
