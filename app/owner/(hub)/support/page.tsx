import nextDynamic from "next/dynamic";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

const OwnerSupportHub = nextDynamic(() => import("@/components/owner/support/OwnerSupportHub"), {
  loading: () => <div className="animate-pulse h-48 rounded-2xl bg-gray-100" />,
});

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Support",
  description: "Get help with your Rydez India host account.",
  path: "/owner/support",
  noIndex: true,
});

export default async function OwnerSupportPage() {
  await requireRole("owner");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Support Center</h1>
        <p className="mt-1 text-sm text-gray-500">Help, tickets, FAQ & emergency contact</p>
      </div>
      <OwnerSupportHub />
    </div>
  );
}
