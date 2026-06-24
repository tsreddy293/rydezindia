"use client";

import { useState } from "react";
import { ChevronDown, Shield } from "lucide-react";
import {
  getCancellationPolicyBullets,
  getCancellationPolicyTitle,
  normalizeBookingTypeForPolicy,
} from "@/lib/services/cancellation-policy";

interface Props {
  bookingType?: string;
  tripType?: string;
  className?: string;
}

export default function CancellationPolicyAccordion({
  bookingType = "self_drive",
  tripType,
  className = "",
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const type = normalizeBookingTypeForPolicy(bookingType, tripType);
  const bullets = getCancellationPolicyBullets(type);
  const title = getCancellationPolicyTitle(type);

  return (
    <div className={`overflow-hidden rounded-2xl border border-emerald-200/80 bg-emerald-50/90 ${className}`}>
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-emerald-100/60 sm:px-5"
          aria-expanded={expanded}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Shield className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
            <span className="text-sm font-semibold text-emerald-900 sm:text-base">
              {expanded ? title : "View Cancellation Policy"}
            </span>
          </span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-emerald-700 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>

        {expanded && (
          <div className="border-t border-emerald-200/80 px-4 pb-4 pt-3 sm:px-5">
            <ul className="space-y-2.5">
              {bullets.map((bullet) => (
                <li
                  key={bullet.text}
                  className={`flex items-start gap-2 text-sm leading-relaxed ${
                    bullet.highlight ? "font-medium text-emerald-900" : "text-emerald-800/90"
                  }`}
                >
                  <span className="mt-0.5 shrink-0 text-emerald-600" aria-hidden>
                    ✓
                  </span>
                  <span>{bullet.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );
}
