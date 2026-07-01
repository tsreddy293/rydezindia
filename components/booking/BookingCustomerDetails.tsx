"use client";

import { BadgeCheck, User } from "lucide-react";
import CheckoutExpandableSection from "@/components/booking/CheckoutExpandableSection";

interface Props {
  name: string;
  mobile?: string;
  email?: string;
  kycApproved?: boolean;
  mobileVerified?: boolean;
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
      <BadgeCheck className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}

export default function BookingCustomerDetails({
  name,
  mobile,
  email,
  kycApproved = false,
  mobileVerified = false,
}: Props) {
  const hasContact = Boolean(mobile || email);
  const showSplitBadges = kycApproved && mobileVerified;

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Customer</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <User className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="truncate text-sm font-semibold text-secondary">{name}</span>
        </div>
        {showSplitBadges ? (
          <>
            <StatusBadge label="KYC Verified" />
            <StatusBadge label="Mobile Verified" />
          </>
        ) : (
          <StatusBadge label="Verified Account" />
        )}
      </div>

      {hasContact && (
        <div className="mt-2">
          <CheckoutExpandableSection title="View Contact Details">
            <div className="space-y-2 text-sm text-gray-600">
              {mobile && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Mobile Number
                  </p>
                  <p>{mobile}</p>
                </div>
              )}
              {email && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Email
                  </p>
                  <p className="truncate">{email}</p>
                </div>
              )}
            </div>
          </CheckoutExpandableSection>
        </div>
      )}
    </div>
  );
}
