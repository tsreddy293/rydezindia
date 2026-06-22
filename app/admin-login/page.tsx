import PageLayout from "@/components/layout/PageLayout";
import RoleLoginForm from "@/components/auth/RoleLoginForm";
import { createPageMetadata } from "@/lib/metadata";
import { ADMIN_LOGIN_PATH } from "@/lib/auth/rbac-paths";

export const metadata = createPageMetadata({
  title: "Admin Login",
  description: "Secure admin access for Rydez India platform management.",
  path: ADMIN_LOGIN_PATH,
  noIndex: true,
});

interface Props {
  searchParams: Promise<{
    error?: string;
    success?: string;
    email?: string;
    unverified?: string;
    verified?: string;
  }>;
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <PageLayout>
      <RoleLoginForm
        role="admin"
        title="Admin Login"
        subtitle="Manage users, vehicles, bookings and reports"
        loginPath={ADMIN_LOGIN_PATH}
        forgotPasswordHref="/forgot-password"
        {...params}
      />
    </PageLayout>
  );
}
