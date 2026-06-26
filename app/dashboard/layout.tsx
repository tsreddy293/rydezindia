import { requireRiderDashboard } from "@/lib/auth/customer-auth";
import RiderLayoutWrapper from "@/components/rider/layout/RiderLayoutWrapper";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <RiderLayoutWrapper>{children}</RiderLayoutWrapper>;
}
