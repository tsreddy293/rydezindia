"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import FormField from "@/components/forms/FormField";
import { createClient } from "@/lib/supabase/client";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) return;
    createClient().auth.exchangeCodeForSession(code).catch(() => {
      setError("Password reset link is invalid or expired.");
    });
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm_password") ?? "");

    if (!PASSWORD_REGEX.test(password)) {
      setError("Password must be at least 8 characters and include uppercase, lowercase, and a number.");
      setLoading(false);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage("Password updated successfully. You can login with your new password.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white border border-gray-100 p-8 shadow-sm space-y-6">
      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
      {message && <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{message}</div>}
      <FormField label="New Password" name="password" type="password" required />
      <FormField label="Confirm Password" name="confirm_password" type="password" required />
      <Button type="submit" variant="primary" className="w-full" disabled={loading}>
        {loading ? "Updating..." : "Update Password"}
      </Button>
    </form>
  );
}
