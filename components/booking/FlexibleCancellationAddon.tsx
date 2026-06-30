"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, ShieldCheck } from "lucide-react";
import FlexibleCancellationPolicyModal from "@/components/booking/FlexibleCancellationPolicyModal";
import ProtectionComparisonTable from "@/components/booking/ProtectionComparisonTable";
import {
  FLEXIBLE_PROTECTION_CARD_BENEFITS,
  FLEXIBLE_PROTECTION_NAME,
  getProtectionFeeForVehicle,
  PROTECTION_CATEGORY_LABELS,
  normalizeVehicleCategory,
} from "@/lib/services/flexible-cancellation-protection";
import { formatINR } from "@/lib/utils";

const COMPACT_PROTECTION_BENEFITS = [
  "Trip Fare Refund",
  "Free Reschedule",
  "Priority Refund",
  "Emergency Support",
  "Faster Customer Support",
] as const;

interface Props {
  vehicleType: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  variant?: "full" | "compact";
}

export default function FlexibleCancellationAddon({
  vehicleType,
  checked,
  onChange,
  disabled,
  variant = "full",
}: Props) {
  const id = useId();
  const [modalOpen, setModalOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const fee = getProtectionFeeForVehicle(vehicleType);
  const category = PROTECTION_CATEGORY_LABELS[normalizeVehicleCategory(vehicleType)];

  if (variant === "compact") {
    return (
      <>
        <div
          className={`rounded-xl border transition-colors ${
            checked ? "border-emerald-300 bg-emerald-50/40" : "border-gray-200 bg-white"
          } ${disabled ? "opacity-60" : ""}`}
        >
          <label
            htmlFor={id}
            className={`flex cursor-pointer items-start gap-3 px-3 py-3 ${disabled ? "cursor-not-allowed" : ""}`}
          >
            <input
              id={id}
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              checked={checked}
              disabled={disabled}
              onChange={(e) => onChange(e.target.checked)}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="text-sm font-semibold text-secondary">{FLEXIBLE_PROTECTION_NAME}</p>
                </div>
                <span className="shrink-0 text-sm font-bold text-emerald-700">
                  {formatINR(fee)} only
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">Protect your booking</p>
            </div>
          </label>

          <div className="border-t border-gray-100 px-3 py-2">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-semibold text-primary"
            >
              <span className="flex items-center gap-1">
                {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                View Details
              </span>
            </button>

            {showDetails && (
              <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                <ul className="space-y-1.5">
                  {COMPACT_PROTECTION_BENEFITS.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="font-bold text-emerald-600">•</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  View full policy
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        <FlexibleCancellationPolicyModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          vehicleType={vehicleType}
        />
      </>
    );
  }

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl border transition-all ${
          checked
            ? "border-emerald-400 bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 shadow-lg ring-2 ring-emerald-200/60"
            : "border-gray-200 bg-gradient-to-br from-white to-emerald-50/30 hover:border-emerald-300 hover:shadow-md"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <div className="border-b border-emerald-100/80 bg-gradient-to-r from-emerald-600/10 to-transparent px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
              <ShieldCheck className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h3 className="text-base font-bold text-secondary sm:text-lg">
                {FLEXIBLE_PROTECTION_NAME}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Protect your booking from unexpected changes.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 py-4 sm:px-5">
          <ul className="space-y-2">
            {FLEXIBLE_PROTECTION_CARD_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 shrink-0 font-bold text-emerald-600">✓</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Price</p>
              <p className="text-2xl font-bold text-emerald-800">{formatINR(fee)}</p>
              <p className="text-xs text-gray-500">{category} · non-refundable</p>
            </div>
          </div>

          <label
            htmlFor={id}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors ${
              checked
                ? "border-emerald-400 bg-emerald-50"
                : "border-gray-200 bg-white hover:border-emerald-200"
            } ${disabled ? "cursor-not-allowed" : ""}`}
          >
            <input
              id={id}
              type="checkbox"
              className="h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              checked={checked}
              disabled={disabled}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className="text-sm font-semibold text-secondary">
              Add Flexible Cancellation Protection
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-emerald-100 bg-white/60 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => setShowComparison((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 sm:text-sm"
          >
            {showComparison ? (
              <>
                Hide comparison <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Regular vs Protected <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary hover:bg-emerald-50 sm:text-sm"
          >
            View full policy
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>

        {showComparison && (
          <div className="border-t border-emerald-100 px-4 pb-4 pt-3 sm:px-5">
            <ProtectionComparisonTable compact />
          </div>
        )}
      </div>

      <FlexibleCancellationPolicyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        vehicleType={vehicleType}
      />
    </>
  );
}
