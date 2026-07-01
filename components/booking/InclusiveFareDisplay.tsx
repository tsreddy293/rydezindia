import { Check } from "lucide-react";
import {
  INCLUSIVE_FARE_NOTE_GST,
  INCLUSIVE_FARE_NOTE_NO_HIDDEN,
  INCLUSIVE_TRIP_FARE_LABEL,
} from "@/lib/booking/inclusive-fare-display";
import { formatINR } from "@/lib/utils";

type Variant = "dark" | "light";

interface InclusiveFareNotesProps {
  variant?: Variant;
  className?: string;
}

export function InclusiveFareNotes({ variant = "light", className = "" }: InclusiveFareNotesProps) {
  const mutedClass = variant === "dark" ? "text-white/55" : "text-gray-500";
  const checkClass = variant === "dark" ? "text-emerald-400" : "text-emerald-600";

  return (
    <ul className={`space-y-1 text-[11px] leading-relaxed sm:text-xs ${mutedClass} ${className}`}>
      <li className="flex items-center gap-1.5">
        <Check className={`h-3 w-3 shrink-0 ${checkClass}`} strokeWidth={2.5} aria-hidden />
        <span>{INCLUSIVE_FARE_NOTE_GST}</span>
      </li>
      <li className="flex items-center gap-1.5">
        <Check className={`h-3 w-3 shrink-0 ${checkClass}`} strokeWidth={2.5} aria-hidden />
        <span>{INCLUSIVE_FARE_NOTE_NO_HIDDEN}</span>
      </li>
    </ul>
  );
}

interface InclusiveTripFareRowProps {
  amount: number;
  variant?: Variant;
  label?: string;
  showNotes?: boolean;
  size?: "default" | "large";
  className?: string;
}

export function InclusiveTripFareRow({
  amount,
  variant = "light",
  label = INCLUSIVE_TRIP_FARE_LABEL,
  showNotes = true,
  size = "default",
  className = "",
}: InclusiveTripFareRowProps) {
  const labelClass = variant === "dark" ? "text-white/90" : "text-gray-800";
  const amountClass =
    size === "large"
      ? variant === "dark"
        ? "text-accent text-lg font-bold"
        : "text-primary text-lg font-bold"
      : variant === "dark"
        ? "text-white text-sm font-bold sm:text-base"
        : "text-secondary text-sm font-bold sm:text-base";

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`text-xs font-semibold sm:text-sm ${labelClass}`}>{label}</span>
        <span className={`tabular-nums ${amountClass}`}>{formatINR(amount)}</span>
      </div>
      {showNotes ? <InclusiveFareNotes variant={variant} /> : null}
    </div>
  );
}
