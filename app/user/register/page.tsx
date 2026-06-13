"use client";

import { useState } from "react";
import { User, CheckCircle } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import FormField from "@/components/forms/FormField";
import Button from "@/components/ui/Button";
import { signUpUser } from "@/server/actions/auth";

export default function UserRegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    setLoading(true);

    const result = await signUpUser({
        name: String(form.get("name") ?? ""),
        mobile: String(form.get("mobile") ?? ""),
        email: String(form.get("email") ?? ""),
        city: String(form.get("city") ?? ""),
        password: String(form.get("password") ?? ""),
    });

    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error ?? "Registration failed");
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-secondary mb-4">Welcome to Rydez!</h1>
          <p className="text-gray-600 mb-8">Your account has been created. Please verify your email before logging in.</p>
          <Button href="/login" variant="primary">Go to Login</Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mx-auto max-w-xl px-4 py-12 md:px-6">
        <div className="text-center mb-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <User className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-secondary">Create Your Account</h1>
          <p className="text-gray-600 mt-2">Book verified vehicles across India</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white border border-gray-100 p-8 shadow-sm space-y-6">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <FormField label="Full Name" name="name" required />
          <FormField label="Email" name="email" type="email" required />
          <FormField label="Password" name="password" type="password" required />
          <FormField label="City" name="city" required />
          <FormField label="Mobile Number (optional)" name="mobile" type="tel" />
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>
      </div>
    </PageLayout>
  );
}
