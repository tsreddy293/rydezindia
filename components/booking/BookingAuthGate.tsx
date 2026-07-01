"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { bookingLoginRedirectUrl } from "@/lib/auth/booking-route-guard";
import {
  BOOKING_AUTH_TIMEOUT_MS,
  resolveClientBookingReturnPath,
  verifyBookingSession,
} from "@/lib/booking/booking-client-auth";
import { BookingAuthProvider } from "@/components/booking/BookingAuthContext";

interface Props {
  returnPath: string;
  children: ReactNode;
}

type GateStatus = "checking" | "authed" | "redirecting";

/**
 * Client-side booking guard — blocks cached RSC / browser-back views for signed-out users.
 * Redirects to login within BOOKING_AUTH_TIMEOUT_MS; never renders checkout for guests.
 */
export default function BookingAuthGate({ returnPath, children }: Props) {
  const [status, setStatus] = useState<GateStatus>("checking");

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let redirected = false;

    const redirectToLogin = () => {
      if (!active || redirected) return;
      redirected = true;
      setStatus("redirecting");
      const path = resolveClientBookingReturnPath(returnPath);
      window.location.replace(bookingLoginRedirectUrl(path));
    };

    const timeoutId = window.setTimeout(redirectToLogin, BOOKING_AUTH_TIMEOUT_MS);

    void verifyBookingSession(supabase).then((user) => {
      if (!active || redirected) return;
      window.clearTimeout(timeoutId);
      if (!user) {
        redirectToLogin();
        return;
      }
      setStatus("authed");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active || redirected) return;
      if (!session?.user) {
        redirectToLogin();
      }
    });

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      listener.subscription.unsubscribe();
    };
  }, [returnPath]);

  if (status !== "authed") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center text-gray-500">
        {status === "redirecting" ? "Redirecting to login…" : "Checking your session…"}
      </div>
    );
  }

  return <BookingAuthProvider authed>{children}</BookingAuthProvider>;
}
