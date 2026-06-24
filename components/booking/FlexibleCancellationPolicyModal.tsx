"use client";

import { useEffect } from "react";
import { X, ShieldCheck } from "lucide-react";
import {
  FLEXIBLE_PROTECTION_FEATURES,
  FLEXIBLE_PROTECTION_NAME,
  getProtectionFeeForVehicle,
  getProtectionPlanName,
} from "@/lib/services/flexible-cancellation-protection";
import { formatINR } from "@/lib/utils";
import ProtectionComparisonTable from "@/components/booking/ProtectionComparisonTable";

interface Props {
  open: boolean;
  onClose: () => void;
  vehicleType?: string;
}

export default function FlexibleCancellationPolicyModal({ open, onClose, vehicleType }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const fee = getProtectionFeeForVehicle(vehicleType);
  const planName = getProtectionPlanName(vehicleType);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="flexible-protection-policy-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h2 id="flexible-protection-policy-title" className="text-lg font-bold text-secondary sm:text-xl">
                {FLEXIBLE_PROTECTION_NAME} Policy
              </h2>
              <p className="mt-0.5 text-sm text-emerald-700">
                {planName} · {formatINR(fee)} · non-refundable
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-secondary"
            aria-label="Close policy"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6 space-y-6">
          <ul className="space-y-2.5">
            {FLEXIBLE_PROTECTION_FEATURES.map((feature) => (
              <li
                key={feature.text}
                className={`flex items-start gap-2.5 text-sm leading-relaxed ${
                  feature.highlight ? "font-medium text-emerald-900" : "text-gray-700"
                }`}
              >
                <span className="mt-0.5 shrink-0 text-emerald-600" aria-hidden>
                  ✓
                </span>
                <span>{feature.text}</span>
              </li>
            ))}
          </ul>

          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-secondary">
              Regular Policy vs Protected Policy
            </h3>
            <ProtectionComparisonTable />
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
