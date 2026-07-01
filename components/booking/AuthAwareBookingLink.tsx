"use client";

import { useCallback, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { bookingAuthLoginPath } from "@/lib/booking/booking-return-path";
import { verifyBookingSession } from "@/lib/booking/booking-client-auth";

interface Props {
  href: string;
  children: ReactNode;
  className?: string;
}

/** Text-style booking link with the same auth gate as Book Now buttons. */
export default function AuthAwareBookingLink({ href, children, className = "" }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const user = await verifyBookingSession(supabase);
      if (!user) {
        window.location.replace(bookingAuthLoginPath(href));
        return;
      }
      window.location.assign(href);
    } finally {
      setLoading(false);
    }
  }, [href, loading]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`text-left font-medium text-primary hover:underline disabled:opacity-60 ${className}`}
    >
      {loading ? "Checking session…" : children}
    </button>
  );
}
