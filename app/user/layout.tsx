import RiderLayoutWrapper from "@/components/rider/layout/RiderLayoutWrapper";

export const dynamic = "force-dynamic";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return <RiderLayoutWrapper>{children}</RiderLayoutWrapper>;
}
