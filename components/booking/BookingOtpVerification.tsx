"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

interface Props {
  mobile: string;
  onVerified: () => void;
  disabled?: boolean;
}

export default function BookingOtpVerification({ mobile, onVerified, disabled }: Props) {
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState<string>();

  const normalizedMobile = mobile.replace(/\s/g, "");
  const mobileValid = /^[6-9]\d{9}$/.test(normalizedMobile);

  async function sendOtp() {
    if (!mobileValid) {
      setError("Enter a valid 10-digit mobile number first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: normalizedMobile, purpose: "booking" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Failed to send OTP");
      }
      setSent(true);
      if (data.devOtp) setDevOtp(String(data.devOtp));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    }
    setBusy(false);
  }

  async function verifyOtpCode() {
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: normalizedMobile, otp, purpose: "booking" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Invalid OTP");
      }
      setVerified(true);
      onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed");
    }
    setBusy(false);
  }

  if (verified) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        Mobile number verified with OTP.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
      <p className="text-sm font-medium text-secondary">Verify mobile with OTP</p>
      <p className="text-xs text-gray-500">Required for booking. We will send a 6-digit code to your mobile.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {devOtp && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Dev OTP: {devOtp}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy || disabled || !mobileValid} onClick={sendOtp}>
          {sent ? "Resend OTP" : "Send OTP"}
        </Button>
      </div>
      {sent && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Enter 6-digit OTP"
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
          />
          <Button type="button" variant="primary" size="sm" disabled={busy || disabled} onClick={verifyOtpCode}>
            Verify OTP
          </Button>
        </div>
      )}
    </div>
  );
}
