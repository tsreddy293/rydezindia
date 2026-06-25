import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";
import { requireAdmin } from "@/lib/auth/admin-auth";
import { ADMIN_HOME_PATH } from "@/lib/auth/rbac-paths";
import AdminLayoutWrapper from "@/components/admin/layout/AdminLayoutWrapper";

export const metadata: Metadata = createPageMetadata({
  title: "Admin Dashboard",
  description: "Rydez India internal admin dashboard.",
  path: ADMIN_HOME_PATH,
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <AdminLayoutWrapper>{children}</AdminLayoutWrapper>;
}
