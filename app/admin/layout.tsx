import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const metadata: Metadata = createPageMetadata({
  title: "Admin Dashboard",
  description: "Rydez India internal admin dashboard.",
  path: "/admin",
  noIndex: true,
});

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");
  return children;
}
