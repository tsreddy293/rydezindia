import PageLayout from "@/components/layout/PageLayout";
import RiderSignupForm from "@/components/auth/RiderSignupForm";
import { selfDriveAuthLoginPath } from "@/lib/kyc/self-drive-nav";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}

export default async function RiderSignupPage({ searchParams }: Props) {
  const { error, redirect: bookingRedirect } = await searchParams;
  const loginHref = bookingRedirect ? selfDriveAuthLoginPath(bookingRedirect) : "/login/rider";

  return (
    <PageLayout>
      <div className="mx-auto max-w-xl px-4 py-12 md:px-6">
        <RiderSignupForm loginHref={loginHref} bookingRedirect={bookingRedirect} initialError={error} />
      </div>
    </PageLayout>
  );
}
