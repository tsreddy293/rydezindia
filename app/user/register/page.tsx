"use client";

import { useState } from "react";
import { User, CheckCircle, Shield } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import FormField from "@/components/forms/FormField";
import Button from "@/components/ui/Button";
import { signUpUser } from "@/server/actions/auth";

export default function UserRegisterPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState({
    name: "",
    mobile: "",
    email: "",
    city: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const form = new FormData(e.currentTarget);

    if (step === 0) {
      setAccount({
        name: String(form.get("name") ?? ""),
        mobile: String(form.get("mobile") ?? ""),
        email: String(form.get("email") ?? ""),
        city: String(form.get("city") ?? ""),
        password: String(form.get("password") ?? ""),
      });
    }

    if (step < 2) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    const result = await signUpUser(account);

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
          <p className="text-gray-600 mb-8">Your account has been created. KYC verification is in progress.</p>
          <Button href="/" variant="primary">Go to Home</Button>
        </div>
      </PageLayout>
    );
  }

  const steps = ["Account Details", "KYC Verification", "Driving Licence"];

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

        <div className="flex gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-gray-200"}`} />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white border border-gray-100 p-8 shadow-sm space-y-6">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          {step === 0 && (
            <>
              <FormField label="Full Name" name="name" required />
              <FormField label="Mobile Number" name="mobile" type="tel" required />
              <FormField label="Email" name="email" type="email" required />
              <FormField label="City" name="city" required />
              <FormField label="Password" name="password" type="password" required />
            </>
          )}

          {step === 1 && (
            <>
              <div className="flex items-center gap-3 bg-primary/5 rounded-xl p-4 mb-4">
                <Shield className="h-6 w-6 text-primary" />
                <p className="text-sm text-gray-600">KYC verification ensures a safe community for all users.</p>
              </div>
              <FormField label="Aadhaar Number" name="aadhaar" required />
              <FormField label="PAN Number" name="pan" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Selfie Verification</label>
                <input type="file" accept="image/*" capture="user" className="w-full text-sm" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <FormField label="Driving Licence Number" name="dl" required />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Driving Licence</label>
                <input type="file" accept="image/*,.pdf" className="w-full text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Selfie with DL</label>
                <input type="file" accept="image/*" capture="user" className="w-full text-sm" />
              </div>
            </>
          )}

          <div className="flex justify-between pt-4">
            <Button type="button" variant="ghost" onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0}>
              Back
            </Button>
            <Button type="submit" variant="primary">
              {loading ? "Creating Account..." : step === 2 ? "Complete Registration" : "Continue"}
            </Button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
