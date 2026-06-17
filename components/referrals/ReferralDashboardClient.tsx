"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import Button from "@/components/ui/Button";

interface Props {
  stats: {
    referralCode: string;
    totalReferrals: number;
    successfulReferrals: number;
    earnings: number;
  };
}

export default function ReferralDashboardClient({ stats }: Props) {
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(stats.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { useReferralCode: apply } = await import("@/server/actions/phase2");
    const result = await apply(code);
    if (result.success) setSuccess(true);
    else setError(result.error ?? "Failed");
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border p-8 text-center">
        <p className="text-sm text-gray-500 mb-2">Your Referral Code</p>
        <div className="flex items-center justify-center gap-3">
          <p className="text-3xl font-bold text-secondary tracking-wider">{stats.referralCode}</p>
          <button type="button" onClick={copyCode} className="text-primary hover:text-primary/80">
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-3">Referrer earns ₹100 · New user gets ₹50</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold">{stats.totalReferrals}</p>
          <p className="text-xs text-gray-500">Total Referrals</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold">{stats.successfulReferrals}</p>
          <p className="text-xs text-gray-500">Successful</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-primary">₹{stats.earnings}</p>
          <p className="text-xs text-gray-500">Earned</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <h3 className="font-semibold mb-3">Have a referral code?</h3>
        <form onSubmit={handleApply} className="flex gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="RYD12345"
            className="flex-1 rounded-xl border px-4 py-2.5 text-sm"
          />
          <Button type="submit" variant="primary" disabled={loading}>Apply</Button>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2">Referral applied! ₹50 credited to wallet.</p>}
      </div>
    </div>
  );
}
