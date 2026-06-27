import { BadgeCheck, Smartphone } from "lucide-react";

interface Props {
  mobile: string;
}

export default function MobileVerifiedNotice({ mobile }: Props) {
  const display = mobile.trim() || "—";

  return (
    <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-4 py-3.5 space-y-2.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        <span className="text-sm font-semibold text-emerald-900">Mobile Verified</span>
        <span className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          Verified
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
        <Smartphone className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
        <span>{display}</span>
      </div>
    </div>
  );
}
