"use client";

import { useCallback, useState, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
  className?: string;
  children: ReactNode;
}

/** Card/link wrapper — guests redirect to login before opening a booking URL. */
export default function AuthAwareBookingLink({ href, className, children }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(
    async (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
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
    <a
      href={href}
      className={className}
      onClick={handleClick}
      aria-busy={loading}
    >
      {children}
    </a>
  );
}
