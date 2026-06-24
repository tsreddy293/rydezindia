"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";
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

interface Props {
  vehicleType: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function FlexibleCancellationAddon({
  vehicleType,
  checked,
  onChange,
  disabled,
}: Props) {
  const id = useId();
  const [modalOpen, setModalOpen] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const fee = getProtectionFeeForVehicle(vehicleType);
  const category = PROTECTION_CATEGORY_LABELS[normalizeVehicleCategory(vehicleType)];

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl border transition-all ${
          checked
            ? "border-emerald-400 bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 shadow-lg ring-2 ring-emerald-200/60"
            : "border-gray-200 bg-gradient-to-br from-white to-emerald-50/30 hover:border-emerald-300 hover:shadow-md"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <div className="absolute right-3 top-3 z-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow-sm sm:text-xs">
            <Sparkles className="h-3 w-3" aria-hidden />
            Recommended
          </span>
        </div>

        <div className="border-b border-emerald-100/80 bg-gradient-to-r from-emerald-600/10 to-transparent px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3 pr-24">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
              <ShieldCheck className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h3 className="text-base font-bold text-secondary sm:text-lg">
                🛡 {FLEXIBLE_PROTECTION_NAME}
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
