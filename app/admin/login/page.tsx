import { Shield } from "lucide-react";
import Button from "@/components/ui/Button";
import FormField from "@/components/forms/FormField";
import { signInWithRole } from "@/server/actions/auth";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Admin Login",
  description: "Rydez India admin login.",
  path: "/admin/login",
  noIndex: true,
});

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
        <div className="text-center mb-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-secondary">Admin Login</h1>
          <p className="text-gray-600 mt-2">Secure access for Rydez India admins</p>
        </div>

        <form action={signInWithRole} className="rounded-2xl bg-white border border-gray-100 p-8 shadow-sm space-y-6">
          <input type="hidden" name="role" value="admin" />
          <input type="hidden" name="loginPath" value="/admin/login" />
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <FormField label="Email" name="email" type="email" required />
          <FormField label="Password" name="password" type="password" required />
          <Button type="submit" variant="primary" className="w-full">
            Login as Admin
          </Button>
        </form>
      </div>
    </div>
  );
}
