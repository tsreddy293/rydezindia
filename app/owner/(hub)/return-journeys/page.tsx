import ReturnJourneyMarketplaceContent from "@/components/return-journey/ReturnJourneyMarketplaceContent";
import { createPageMetadata } from "@/lib/metadata";
import { getOwnerVehiclesList } from "@/server/actions/vehicles";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Return Journey",
  description: "Create and manage return journey listings on Rydez India.",
  path: "/owner/return-journeys",
  noIndex: true,
});

interface Props {
  searchParams: Promise<{ from?: string; to?: string; date?: string }>;
}

export default async function OwnerReturnJourneysPage({ searchParams }: Props) {
  const { user } = await requireRole("owner");
  const params = await searchParams;
  const ownerVehicles = await getOwnerVehiclesList(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Return Journey</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create discounted return listings and browse marketplace deals
        </p>
      </div>
      <ReturnJourneyMarketplaceContent
        from={params.from}
        to={params.to}
        date={params.date}
        ownerVehicles={ownerVehicles}
        variant="owner"
      />
    </div>
  );
}
