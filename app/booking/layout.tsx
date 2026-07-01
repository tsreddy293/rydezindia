import { headers } from "next/headers";
import BookingAuthGate from "@/components/booking/BookingAuthGate";
import { requireRiderForBooking } from "@/lib/auth/customer-auth";

export const dynamic = "force-dynamic";

export default async function BookingLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const returnPath = headerList.get("x-booking-return-path") ?? "/booking";

  await requireRiderForBooking(returnPath);

  return <BookingAuthGate returnPath={returnPath}>{children}</BookingAuthGate>;
}
