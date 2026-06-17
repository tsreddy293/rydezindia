import PageLayout from "@/components/layout/PageLayout";
import RoleLoginForm from "@/components/auth/RoleLoginForm";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Rider Login",
  description: "Login to book rides and rentals on Rydez India.",
  path: "/login/rider",
});

interface Props {
  searchParams: Promise<{ error?: string; success?: string; email?: string; unverified?: string; verified?: string }>;
}

export default async function RiderLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <PageLayout>
      <RoleLoginForm
        role="rider"
        title="Rider Login"
        subtitle="Book rides, rentals and return journeys"
        loginPath="/login/rider"
        forgotPasswordHref="/forgot-password"
        signupHref="/signup/rider"
        signupLabel="Create Rider Account"
        {...params}
      />
    </PageLayout>
  );
}
