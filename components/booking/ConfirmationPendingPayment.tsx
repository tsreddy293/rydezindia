"use client";

import { useRouter } from "next/navigation";
import BookingPendingPayment from "@/components/booking/BookingPendingPayment";
import type { SelfDrivePaymentSnapshot } from "@/lib/bookings/self-drive-payment";

interface Props {
  bookingId: string;
  totalFare: number;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  fullPaymentOnly?: boolean;
  selfDrive?: {
    bookingStatus: string;
    paymentStatus: string;
    snapshot: SelfDrivePaymentSnapshot;
    pickupDate?: string;
    bookingAmount?: number;
  };
}

export default function ConfirmationPendingPayment(props: Props) {
  const router = useRouter();
  const isSelfDrive = Boolean(props.selfDrive);

  return (
    <BookingPendingPayment
      {...props}
      onPaid={() => router.refresh()}
      onSkip={isSelfDrive ? undefined : () => router.push("/dashboard/bookings")}
      skipLabel={isSelfDrive ? undefined : "Pay later — view my bookings"}
    />
  );
}
