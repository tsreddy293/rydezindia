import {
  normalizeOnboardingStatus,
  onboardingStatusClasses,
  onboardingStatusLabel,
  type VehicleOnboardingStatus,
} from "@/lib/services/vehicle-onboarding";

interface Props {
  status: string;
  reuploadRequested?: boolean;
}

export default function VehicleStatusBadge({ status, reuploadRequested }: Props) {
  const normalized = normalizeOnboardingStatus(status);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${onboardingStatusClasses(normalized)}`}>
      {onboardingStatusLabel(normalized)}
      {reuploadRequested && normalized !== "approved" && (
        <span className="text-[10px] uppercase tracking-wide">· Re-upload</span>
      )}
    </span>
  );
}

export { onboardingStatusLabel, type VehicleOnboardingStatus };
