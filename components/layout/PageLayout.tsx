import Header from "./Header";
import Footer from "./Footer";
import WhatsAppButton from "./WhatsAppButton";
import SessionTimeout from "@/components/auth/SessionTimeout";

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
      <WhatsAppButton />
      <SessionTimeout />
    </>
  );
}
