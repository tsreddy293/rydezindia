import Link from "next/link";
import { User } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import FormField from "@/components/forms/FormField";
import { registerRiderWithKyc } from "@/server/actions/auth";
import {
  formatMaxSizeLabel,
} from "@/lib/kyc/upload-rules";
import { selfDriveAuthLoginPath } from "@/lib/kyc/self-drive-nav";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}

const KYC_FIELDS = [
  { name: "aadhaar_front", label: "Aadhaar Front", accept: "image/*,.pdf" },
  { name: "aadhaar_back", label: "Aadhaar Back", accept: "image/*,.pdf" },
  { name: "driving_license", label: "Driving License", accept: "image/*,.pdf" },
  { name: "selfie", label: "Selfie Photo", accept: "image/*" },
] as const;

export default async function RiderSignupPage({ searchParams }: Props) {
  const { error, redirect: bookingRedirect } = await searchParams;
  const loginHref = bookingRedirect ? selfDriveAuthLoginPath(bookingRedirect) : "/login/rider";

  return (
    <PageLayout>
      <div className="mx-auto max-w-xl px-4 py-12 md:px-6">
        <div className="text-center mb-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <User className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-secondary">Create Rider Account</h1>
          <p className="text-gray-600 mt-2">
            Register with identity documents for self-drive bookings
          </p>
          <Link href="/signup" className="text-sm text-primary hover:underline mt-2 inline-block">
            Change account type
          </Link>
        </div>

        <form
          action={registerRiderWithKyc}
          encType="multipart/form-data"
          className="rounded-2xl bg-white border border-gray-100 p-8 shadow-sm space-y-6"
        >
          {bookingRedirect && <input type="hidden" name="redirect" value={bookingRedirect} />}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Account Details</h2>
            <FormField label="Full Name" name="name" required />
            <FormField label="Mobile Number" name="mobile" type="tel" required placeholder="10-digit mobile" />
            <FormField label="Email" name="email" type="email" required />
            <FormField label="Password" name="password" type="password" required />
            <p className="text-xs text-gray-500">At least 8 characters with uppercase, lowercase, and a number.</p>
          </div>

          <div className="space-y-4 border-t border-gray-100 pt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">KYC Documents</h2>
            <p className="text-sm text-gray-500">
              Required for self-drive rentals. Status will be Pending until admin approval.
            </p>
            {KYC_FIELDS.map(({ name, label, accept }) => {
              const fieldKey = name as "aadhaar_front" | "aadhaar_back" | "driving_license" | "selfie";
              return (
                <div key={name}>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    {label} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    name={name}
                    accept={accept}
                    required
                    className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary"
                  />
                  <p className="mt-1 text-xs text-gray-400">{formatMaxSizeLabel(fieldKey)}</p>
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Create Account & Submit KYC
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href={loginHref} className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </PageLayout>
  );
}
