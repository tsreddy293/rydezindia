import Header from "./Header";
import BookingMinimalFooter from "./BookingMinimalFooter";
import SessionTimeout from "@/components/auth/SessionTimeout";

/** Checkout-focused layout without full site footer or floating widgets. */
export default function BookingPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <BookingMinimalFooter />
      <SessionTimeout />
    </>
  );
}
