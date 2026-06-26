import OwnerLayoutWrapper from "@/components/owner/layout/OwnerLayoutWrapper";

export const dynamic = "force-dynamic";

export default function OwnerHubLayout({ children }: { children: React.ReactNode }) {
  return <OwnerLayoutWrapper>{children}</OwnerLayoutWrapper>;
}
