"use client";

import {
  normalizeOnboardingStatus,
  onboardingStatusClasses,
  onboardingStatusLabel,
} from "@/lib/services/vehicle-onboarding";

interface Props {
  status: string;
}

export default function VehicleStatusBadge({ status }: Props) {
  const normalized = normalizeOnboardingStatus(status);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${onboardingStatusClasses(normalized)}`}>
      {onboardingStatusLabel(normalized)}
    </span>
  );
}
