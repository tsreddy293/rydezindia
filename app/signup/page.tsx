import PageLayout from "@/components/layout/PageLayout";
import AuthRolePicker from "@/components/auth/AuthRolePicker";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Sign Up",
  description: "Join Rydez India as a rider or vehicle owner.",
  path: "/signup",
});

export default function SignupRoleSelectionPage() {
  return (
    <PageLayout>
      <AuthRolePicker mode="signup" />
    </PageLayout>
  );
}
