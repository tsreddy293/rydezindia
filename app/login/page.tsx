import { redirect } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import AuthRolePicker from "@/components/auth/AuthRolePicker";
import { createPageMetadata } from "@/lib/metadata";
import { safeRiderRedirectPath } from "@/lib/kyc/self-drive-nav";

export const metadata = createPageMetadata({
  title: "Login",
  description: "Choose how you want to sign in to Rydez India — as a rider or vehicle owner.",
  path: "/login",
});

interface Props {
  searchParams: Promise<{ returnTo?: string; redirect?: string }>;
}

export default async function LoginRoleSelectionPage({ searchParams }: Props) {
  const params = await searchParams;
  const returnPath = safeRiderRedirectPath(params.returnTo ?? params.redirect ?? "");

  if (returnPath) {
    redirect(`/login/rider?redirect=${encodeURIComponent(returnPath)}`);
  }

  return (
    <PageLayout>
      <AuthRolePicker mode="login" />
    </PageLayout>
  );
}
