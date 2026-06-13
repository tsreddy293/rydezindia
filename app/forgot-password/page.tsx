import { KeyRound } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import Button from "@/components/ui/Button";
import FormField from "@/components/forms/FormField";
import { requestPasswordReset } from "@/server/actions/auth";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Forgot Password",
  description: "Reset your Rydez India account password.",
  path: "/forgot-password",
});

interface Props {
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { error, success } = await searchParams;
  return (
    <PageLayout>
      <div className="mx-auto max-w-md px-4 py-12 md:px-6">
        <div className="text-center mb-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-secondary">Forgot Password</h1>
          <p className="text-gray-600 mt-2">Enter your email to receive a secure reset link.</p>
        </div>
        <form action={requestPasswordReset} className="rounded-2xl bg-white border border-gray-100 p-8 shadow-sm space-y-6">
          <input type="hidden" name="loginPath" value="/forgot-password" />
          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
          {success && <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}
          <FormField label="Email" name="email" type="email" required />
          <Button type="submit" variant="primary" className="w-full">Send Reset Email</Button>
          <Button href="/login" variant="outline" className="w-full">Back to Login</Button>
        </form>
      </div>
    </PageLayout>
  );
}
