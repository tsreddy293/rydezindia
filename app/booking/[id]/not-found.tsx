import PageLayout from "@/components/layout/PageLayout";
import Button from "@/components/ui/Button";

export default function BookingNotFound() {
  return (
    <PageLayout>
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-secondary mb-4">Journey Not Found</h1>
        <p className="text-gray-600 mb-8">
          This ride is no longer available or the link is invalid.
        </p>
        <Button href="/search" variant="primary">
          Search Vehicles
        </Button>
      </div>
    </PageLayout>
  );
}
