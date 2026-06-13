import { LogIn } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import Button from "@/components/ui/Button";
import FormField from "@/components/forms/FormField";
import { signInWithRole } from "@/server/actions/auth";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Owner Login",
  description: "Login to your Rydez India owner account.",
  path: "/owner/login",
});

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function OwnerLoginPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <PageLayout>
      <div className="mx-auto max-w-md px-4 py-12 md:px-6">
        <div className="text-center mb-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <LogIn className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-secondary">Owner Login</h1>
          <p className="text-gray-600 mt-2">Access your owner dashboard</p>
        </div>

        <form action={signInWithRole} className="rounded-2xl bg-white border border-gray-100 p-8 shadow-sm space-y-6">
          <input type="hidden" name="role" value="owner" />
          <input type="hidden" name="loginPath" value="/owner/login" />
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <FormField label="Email" name="email" type="email" required />
          <FormField label="Password" name="password" type="password" required />
          <Button type="submit" variant="primary" className="w-full">
            Login as Owner
          </Button>
          <Button href="/owner/register" variant="outline" className="w-full">
            Create Owner Account
          </Button>
        </form>
      </div>
    </PageLayout>
  );
}
