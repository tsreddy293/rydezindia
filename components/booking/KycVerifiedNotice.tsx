import { BadgeCheck } from "lucide-react";

export default function KycVerifiedNotice() {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-2 text-sm font-medium text-green-700">
      <BadgeCheck className="h-5 w-5 shrink-0" />
      KYC Verified ✓
    </div>
  );
}
