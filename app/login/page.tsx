import { LogIn } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import Button from "@/components/ui/Button";
import FormField from "@/components/forms/FormField";
import { resendVerificationEmail, signInWithRole } from "@/server/actions/auth";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Login",
  description: "Login to your Rydez India account.",
  path: "/login",
});

interface Props {
  searchParams: Promise<{ error?: string; success?: string; email?: string; unverified?: string; verified?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { error, success, email, unverified, verified } = await searchParams;

  return (
    <PageLayout>
      <div className="mx-auto max-w-md px-4 py-12 md:px-6">
        <div className="text-center mb-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <LogIn className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-secondary">Login</h1>
          <p className="text-gray-600 mt-2">Access your Rydez India account</p>
        </div>

        <form action={signInWithRole} className="rounded-2xl bg-white border border-gray-100 p-8 shadow-sm space-y-6">
          <input type="hidden" name="loginPath" value="/login" />
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          {(success || verified) && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              {success || "Email verified. You can login now."}
            </div>
          )}
          <FormField label="Email" name="email" type="email" required />
          <FormField label="Password" name="password" type="password" required />
          <div className="flex items-center justify-between text-sm">
            <a href="/forgot-password" className="text-primary hover:underline">Forgot Password?</a>
          </div>
          <Button type="submit" variant="primary" className="w-full">
            Login
          </Button>
        </form>
        {unverified && email && (
          <form action={resendVerificationEmail} className="mt-4 rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="loginPath" value="/login" />
            <Button type="submit" variant="outline" className="w-full">Resend Verification Email</Button>
          </form>
        )}
      </div>
    </PageLayout>
  );
}
