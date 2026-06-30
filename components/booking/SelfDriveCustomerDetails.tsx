"use client";

import { BadgeCheck, User } from "lucide-react";
import CheckoutExpandableSection from "@/components/booking/CheckoutExpandableSection";

interface Props {
  name: string;
  mobile?: string;
  email?: string;
}

export default function SelfDriveCustomerDetails({ name, mobile, email }: Props) {
  const hasContact = Boolean(mobile || email);

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        Customer Details
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <User className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm font-semibold text-secondary">{name}</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
          <BadgeCheck className="h-3 w-3" />
          KYC Verified
        </span>
      </div>

      {hasContact && (
        <div className="mt-2">
          <CheckoutExpandableSection title="View Contact Details" summary="Phone & email">
            <div className="space-y-1 text-sm text-gray-600">
              {mobile && <p>{mobile}</p>}
              {email && <p className="truncate">{email}</p>}
            </div>
          </CheckoutExpandableSection>
        </div>
      )}
    </div>
  );
}
