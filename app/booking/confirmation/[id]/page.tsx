import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import Button from "@/components/ui/Button";
import { getBookingConfirmationById } from "@/lib/supabase/queries";
import { formatDate, formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookingConfirmationPage({ params }: Props) {
  const { id } = await params;
  const booking = await getBookingConfirmationById(id);

  if (!booking) notFound();

  return (
    <PageLayout>
      <div className="mx-auto max-w-2xl px-4 py-16 md:px-6">
        <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-5 h-16 w-16 text-green-500" />
          <h1 className="text-3xl font-bold text-secondary">Booking Request Confirmed</h1>
          <p className="mt-2 text-gray-600">Your request has been received by Rydez India.</p>

          <div className="mt-8 rounded-xl bg-gray-50 p-5 text-left text-sm">
            <div className="flex justify-between border-b border-gray-200 py-2">
              <span className="text-gray-500">Booking ID</span>
              <span className="font-medium text-secondary">{booking.id}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 py-2">
              <span className="text-gray-500">Type</span>
              <span className="font-medium text-secondary">{booking.booking_type}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 py-2">
              <span className="text-gray-500">Passenger</span>
              <span className="font-medium text-secondary">{booking.passenger_name}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 py-2">
              <span className="text-gray-500">Amount</span>
              <span className="font-medium text-primary">{formatINR(booking.amount)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 py-2">
              <span className="text-gray-500">Status</span>
              <span className="font-medium text-secondary">{booking.booking_status}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Created</span>
              <span className="font-medium text-secondary">{formatDate(booking.created_at)}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href="/search" variant="primary">Book Another Vehicle</Button>
            <Button href="/" variant="outline">Back to Home</Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
