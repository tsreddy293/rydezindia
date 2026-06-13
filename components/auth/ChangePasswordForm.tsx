import Button from "@/components/ui/Button";
import FormField from "@/components/forms/FormField";
import { changePassword } from "@/server/actions/auth";

export default function ChangePasswordForm({
  returnTo,
  error,
  success,
}: {
  returnTo: string;
  error?: string;
  success?: string;
}) {
  return (
    <section className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-semibold text-secondary">Change Password</h2>
      <form action={changePassword} className="space-y-5">
        <input type="hidden" name="returnTo" value={returnTo} />
        {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
        {success && <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}
        <FormField label="Current Password" name="current_password" type="password" required />
        <FormField label="New Password" name="new_password" type="password" required />
        <FormField label="Confirm Password" name="confirm_password" type="password" required />
        <Button type="submit" variant="primary">Update Password</Button>
      </form>
    </section>
  );
}
