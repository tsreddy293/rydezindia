import PageLayout from "@/components/layout/PageLayout";
import RoleLoginForm from "@/components/auth/RoleLoginForm";
import { createPageMetadata } from "@/lib/metadata";
import { isSelfDriveBookingPath } from "@/lib/kyc/self-drive-nav";

export const metadata = createPageMetadata({
  title: "Rider Login",
  description: "Login to book rides and rentals on Rydez India.",
  path: "/login/rider",
});

interface Props {
  searchParams: Promise<{
    error?: string;
    success?: string;
    email?: string;
    unverified?: string;
    verified?: string;
    redirect?: string;
  }>;
}

export default async function RiderLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const selfDriveBooking = params.redirect ? isSelfDriveBookingPath(params.redirect) : false;
  return (
    <PageLayout>
      <RoleLoginForm
        role="rider"
        title="Rider Login"
        subtitle={
          selfDriveBooking
            ? "Sign in to continue your self-drive booking"
            : "Book rides, rentals and return journeys"
        }
        loginPath="/login/rider"
        forgotPasswordHref="/forgot-password"
        signupHref="/signup/rider"
        signupLabel="Create Rider Account"
        redirect={params.redirect}
        {...params}
      />
    </PageLayout>
  );
}
