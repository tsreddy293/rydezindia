"use client";

import { useRouter } from "next/navigation";
import BookingPendingPayment from "@/components/booking/BookingPendingPayment";

interface Props {
  bookingId: string;
  totalFare: number;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  fullPaymentOnly?: boolean;
}

export default function ConfirmationPendingPayment(props: Props) {
  const router = useRouter();

  return (
    <BookingPendingPayment
      {...props}
      onPaid={() => router.refresh()}
      onSkip={() => router.push("/dashboard/bookings")}
      skipLabel="Pay later — view my bookings"
    />
  );
}
