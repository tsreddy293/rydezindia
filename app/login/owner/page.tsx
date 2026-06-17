import PageLayout from "@/components/layout/PageLayout";
import RoleLoginForm from "@/components/auth/RoleLoginForm";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Owner Login",
  description: "Login to your Rydez India vehicle owner account.",
  path: "/login/owner",
});

interface Props {
  searchParams: Promise<{ error?: string; success?: string; email?: string; unverified?: string; verified?: string }>;
}

export default async function OwnerLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <PageLayout>
      <RoleLoginForm
        role="owner"
        title="Vehicle Owner Login"
        subtitle="Manage vehicles, bookings and earnings"
        loginPath="/login/owner"
        forgotPasswordHref="/owner/forgot-password"
        signupHref="/signup/owner"
        signupLabel="Register as Vehicle Owner"
        {...params}
      />
    </PageLayout>
  );
}
