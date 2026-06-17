import { notFound } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import Button from "@/components/ui/Button";
import { getSeoRoute, SEO_ROUTES } from "@/lib/data/seo-routes";
import { createPageMetadata } from "@/lib/metadata";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return SEO_ROUTES.map((route) => ({ slug: route.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const route = getSeoRoute(slug);
  if (!route) return {};
  return createPageMetadata({
    title: `${route.from} to ${route.to} Cab Booking`,
    description: route.description,
    path: `/routes/${slug}`,
  });
}

export default async function RouteLandingPage({ params }: Props) {
  const { slug } = await params;
  const route = getSeoRoute(slug);
  if (!route) notFound();

  const searchUrl = `/search-driver?pickupCity=${encodeURIComponent(route.from)}&dropCity=${encodeURIComponent(route.to)}`;
  const returnUrl = `/return-journeys?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`;

  return (
    <PageLayout>
      <div className="mx-auto max-w-4xl px-4 py-16 md:px-6">
        <h1 className="text-4xl font-bold text-secondary">
          {route.from} to {route.to} Cab Booking
        </h1>
        <p className="mt-4 text-lg text-gray-600">{route.description}</p>
        <p className="mt-2 text-gray-500">Approx. distance: {route.distanceKm} km</p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Button href={searchUrl} variant="primary" size="lg">Search Vehicles</Button>
          <Button href={returnUrl} variant="outline" size="lg">Return Journey Deals</Button>
        </div>

        <section className="mt-12 rounded-2xl bg-gray-50 p-8">
          <h2 className="text-xl font-semibold mb-4">Why book with Rydez India?</h2>
          <ul className="space-y-2 text-gray-600">
            <li>✅ Verified owners and vehicles</li>
            <li>🔥 Save up to 40% on return journey deals</li>
            <li>📍 Rural pickup points available</li>
            <li>💳 Secure Razorpay payments</li>
          </ul>
        </section>
      </div>
    </PageLayout>
  );
}
