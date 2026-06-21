"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, User } from "lucide-react";
import FormField from "@/components/forms/FormField";
import BookingOtpVerification from "@/components/booking/BookingOtpVerification";
import { registerRider } from "@/server/actions/auth";

interface Props {
  loginHref: string;
  bookingRedirect?: string;
  initialError?: string;
}

export default function RiderSignupForm({ loginHref, bookingRedirect, initialError }: Props) {
  const [error, setError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(false);
  const [mobile, setMobile] = useState("");
  const [mobileOtpVerified, setMobileOtpVerified] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!mobileOtpVerified) {
      setError("Please verify your mobile number with OTP before creating an account.");
      return;
    }

    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    if (bookingRedirect) {
      formData.set("redirect", bookingRedirect);
    }

    try {
      await registerRider(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="text-center mb-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <User className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-secondary">Create Rider Account</h1>
        <p className="text-gray-600 mt-2">
          Verify your mobile, create an account, then upload KYC for self-drive bookings
        </p>
        <Link href="/signup" className="text-sm text-primary hover:underline mt-2 inline-block">
          Change account type
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white border border-gray-100 p-8 shadow-sm space-y-6"
      >
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Account Details</h2>
          <FormField label="Full Name" name="name" required />
          <FormField
            label="Mobile Number"
            name="mobile"
            type="tel"
            required
            placeholder="10-digit mobile"
            value={mobile}
            onChange={(e) => {
              setMobile(e.target.value);
              setMobileOtpVerified(false);
            }}
          />
          <FormField label="Email" name="email" type="email" required />
          <FormField label="Password" name="password" type="password" required />
          <p className="text-xs text-gray-500">At least 8 characters with uppercase, lowercase, and a number.</p>
        </div>

        <BookingOtpVerification
          mobile={mobile}
          purpose="signup"
          onVerified={() => setMobileOtpVerified(true)}
        />

        <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800">
          <p className="font-medium">After registration</p>
          <p className="mt-1 text-blue-700">
            Upload Aadhaar (front & back), Driving License, and Selfie for self-drive rentals. KYC status
            will be Pending until admin approval. Other services only need mobile OTP at booking time.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !mobileOtpVerified}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </button>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href={loginHref} className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </>
  );
}
