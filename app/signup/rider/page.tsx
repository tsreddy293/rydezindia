"use client";

import { useState } from "react";
import Link from "next/link";
import { User, CheckCircle } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import FormField from "@/components/forms/FormField";
import Button from "@/components/ui/Button";
import { signUpRider } from "@/server/actions/auth";

export default function RiderSignupPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const result = await signUpRider({
      name: String(form.get("name") ?? ""),
      mobile: String(form.get("mobile") ?? ""),
      email: String(form.get("email") ?? ""),
      city: String(form.get("city") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (result.success) setSubmitted(true);
    else {
      setError(result.error ?? "Registration failed");
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-secondary mb-4">Welcome to Rydez!</h1>
          <p className="text-gray-600 mb-8">Your rider account has been created. Please verify your email before logging in.</p>
          <Button href="/login/rider" variant="primary">Go to Rider Login</Button>
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
          <h1 className="text-3xl font-bold text-secondary">Create Rider Account</h1>
          <p className="text-gray-600 mt-2">Search and book verified vehicles across India</p>
          <Link href="/signup" className="text-sm text-primary hover:underline mt-2 inline-block">
            Change account type
          </Link>
        </div>
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white border border-gray-100 p-8 shadow-sm space-y-6">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
          )}
          <FormField label="Full Name" name="name" required />
          <FormField label="Email" name="email" type="email" required />
          <FormField label="Password" name="password" type="password" required />
          <FormField label="City" name="city" required />
          <FormField label="Mobile Number (optional)" name="mobile" type="tel" />
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? "Creating Account..." : "Create Rider Account"}
          </Button>
          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login/rider" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </PageLayout>
  );
}
