"use client";

import { useCallback, useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { bookingAuthLoginPath } from "@/lib/booking/booking-return-path";
import { verifyBookingSession } from "@/lib/booking/booking-client-auth";

interface Props {
  href: string;
  variant?: "primary" | "outline" | "secondary" | "accent" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
}

/**
 * Book Now — verifies Supabase session before navigation.
 * Guests go straight to login; riders use a full page load so middleware + server auth run.
 */
export default function AuthAwareBookNowLink({
  href,
  variant = "primary",
  size = "sm",
  children,
  className,
}: Props) {
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
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "Checking…" : children}
    </Button>
  );
}
