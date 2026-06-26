import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Settings",
  description: "Owner account settings on Rydez India.",
  path: "/owner/settings",
  noIndex: true,
});

interface Props {
  searchParams: Promise<{ passwordError?: string; passwordSuccess?: string }>;
}

export default async function OwnerSettingsPage({ searchParams }: Props) {
  await requireRole("owner");
  const { passwordError, passwordSuccess } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Account security and preferences</p>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-secondary">Change Password</h2>
        <ChangePasswordForm returnTo="/owner/settings" error={passwordError} success={passwordSuccess} />
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-2 font-semibold text-secondary">Preferences</h2>
        <p className="text-sm text-gray-500">Notification and display preferences will be available in a future update.</p>
      </section>
    </div>
  );
}
