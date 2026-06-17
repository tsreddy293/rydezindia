import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import { POPULAR_ROUTES } from "@/lib/services/route-matching";

export default function PopularRoutes() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-secondary">Popular Routes</h2>
          <p className="mt-2 text-gray-600">
            Most booked intercity routes across South India
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {POPULAR_ROUTES.map((route) => {
            const label = `${route.from} ↔ ${route.to}`;
            const searchUrl = `/search-driver?pickupCity=${encodeURIComponent(route.from)}&dropCity=${encodeURIComponent(route.to)}`;
            const returnUrl = `/return-journeys?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`;

            return (
              <div
                key={label}
                className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <p className="font-semibold text-secondary">{route.from}</p>
                <p className="text-primary text-sm my-1">↔</p>
                <p className="font-semibold text-secondary mb-4">{route.to}</p>
                <div className="flex flex-col gap-2">
                  <Link
                    href={searchUrl}
                    className="flex items-center justify-between text-sm text-primary hover:underline"
                  >
                    Search vehicles
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href={returnUrl}
                    className="flex items-center justify-between text-sm text-orange-600 hover:underline"
                  >
                    Return deals
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button href="/search" variant="primary">
            Explore All Routes
          </Button>
        </div>
      </div>
    </section>
  );
}
