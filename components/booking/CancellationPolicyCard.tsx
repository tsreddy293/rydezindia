import { Shield } from "lucide-react";
import {
  getCancellationPolicyBullets,
  getCancellationPolicyTitle,
  REFUND_PROCESSING_ESTIMATE,
  normalizeBookingTypeForPolicy,
} from "@/lib/services/cancellation-policy";

interface Props {
  bookingType?: string;
  tripType?: string;
  compact?: boolean;
  className?: string;
}

export default function CancellationPolicyCard({
  bookingType = "self_drive",
  tripType,
  compact = false,
  className = "",
}: Props) {
  const type = normalizeBookingTypeForPolicy(bookingType, tripType);
  const bullets = getCancellationPolicyBullets(type);
  const title = getCancellationPolicyTitle(type);

  return (
    <div
      className={`rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-5 shadow-sm ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Shield className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-secondary">
            {compact ? "Cancellation Policy" : `🛡 ${title}`}
          </h3>
          {!compact && (
            <p className="mt-1 text-xs text-gray-500">{REFUND_PROCESSING_ESTIMATE}</p>
          )}
          <ul className="mt-3 space-y-2">
            {bullets.map((bullet) => (
              <li
                key={bullet.text}
                className={`flex items-start gap-2 text-sm ${
                  bullet.highlight ? "font-medium text-emerald-800" : "text-gray-700"
                }`}
              >
                <span className="mt-0.5 text-emerald-600 shrink-0" aria-hidden>
                  ✓
                </span>
                <span>{bullet.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
