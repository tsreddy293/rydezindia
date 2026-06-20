"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCustomerKycStatus } from "@/server/actions/customerKyc";
import { safeRiderRedirectPath } from "@/lib/kyc/self-drive-nav";

type Props = {
  initialStatus: string;
  bookingReturn?: string;
  reason?: string;
  pollMs?: number;
};

/**
 * When KYC is pending for self-drive, poll until approved then redirect to booking.
 * Server redirect handles users who reload after approval.
 */
export default function SelfDriveKycAutoRedirect({
  initialStatus,
  bookingReturn,
  reason,
  pollMs = 8000,
}: Props) {
  const router = useRouter();
  const redirected = useRef(false);
  const safeReturn = safeRiderRedirectPath(bookingReturn);

  useEffect(() => {
    if (reason !== "self_drive" || !safeReturn) return;
    if (initialStatus === "approved") {
      router.replace(safeReturn);
      return;
    }
    if (initialStatus !== "pending") return;

    const interval = window.setInterval(async () => {
      if (redirected.current) return;
      try {
        const result = await getCustomerKycStatus();
        if (result.status === "approved") {
          redirected.current = true;
          router.replace(safeReturn);
        }
      } catch {
        /* ignore poll errors */
      }
    }, pollMs);

    return () => window.clearInterval(interval);
  }, [initialStatus, reason, safeReturn, pollMs, router]);

  return null;
}
