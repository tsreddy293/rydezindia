import { KeyRound } from "lucide-react";
import { Suspense } from "react";
import PageLayout from "@/components/layout/PageLayout";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Reset Password",
  description: "Create a new secure password for your Rydez India account.",
  path: "/reset-password",
});

export default function ResetPasswordPage() {
  return (
    <PageLayout>
      <div className="mx-auto max-w-md px-4 py-12 md:px-6">
        <div className="text-center mb-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-secondary">Reset Password</h1>
          <p className="text-gray-600 mt-2">Choose a strong new password.</p>
        </div>
        <Suspense fallback={<div className="rounded-2xl bg-white border border-gray-100 p-8 shadow-sm text-sm text-gray-500">Loading reset form...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </PageLayout>
  );
}
