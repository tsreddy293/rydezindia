import nextDynamic from "next/dynamic";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

const OwnerReviewsHub = nextDynamic(() => import("@/components/owner/reviews/OwnerReviewsHub"), {
  loading: () => <div className="animate-pulse h-48 rounded-2xl bg-gray-100" />,
});

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Reviews",
  description: "Customer reviews for your fleet on Rydez India.",
  path: "/owner/reviews",
  noIndex: true,
});

export default async function OwnerReviewsPage() {
  await requireRole("owner");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Reviews</h1>
        <p className="mt-1 text-sm text-gray-500">Ratings, distribution & guest feedback</p>
      </div>
      <OwnerReviewsHub />
    </div>
  );
}
