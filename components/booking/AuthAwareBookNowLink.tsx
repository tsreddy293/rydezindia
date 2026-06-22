"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { bookingAuthLoginPath } from "@/lib/booking/booking-return-path";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

interface Props {
  href: string;
  variant?: "primary" | "outline" | "secondary" | "accent" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
}

/** Self-drive Book Now — guests go to login with returnTo; riders continue to booking. */
export default function AuthAwareBookNowLink({
  href,
  variant = "primary",
  size = "sm",
  children,
  className,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
      if (loading) return;

      setLoading(true);
      try {
        const supabase = createClient();
        const result = await withTimeout(supabase.auth.getSession(), 2500);
        const session = result?.data?.session;

        if (!session?.user) {
          window.location.href = bookingAuthLoginPath(href);
          return;
        }

        router.push(href);
      } finally {
        setLoading(false);
      }
    },
    [href, loading, router]
  );

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
