import PageLayout from "@/components/layout/PageLayout";
import ReturnJourneyMarketplaceContent from "@/components/return-journey/ReturnJourneyMarketplaceContent";
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

  let ownerVehicles: Awaited<ReturnType<typeof getOwnerVehiclesList>> = [];
  const role = await getCurrentUserRole();
  if (role === "owner") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      ownerVehicles = await getOwnerVehiclesList(data.user.id);
    }
  }

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <ReturnJourneyMarketplaceContent
          from={params.from}
          to={params.to}
          date={params.date}
          ownerVehicles={ownerVehicles}
          variant="public"
        />
      </div>
    </PageLayout>
  );
}
