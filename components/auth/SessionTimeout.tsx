"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_MS = 60 * 1000;

export default function SessionTimeout() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    mountedRef.current = true;

    async function logout() {
      if (!mountedRef.current) return;
      await supabase.auth.signOut();
      window.location.href = "/";
    }

    function clearTimers() {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    }

    function startCountdown() {
      if (!mountedRef.current) return;
      setSecondsLeft(WARNING_MS / 1000);
      countdownRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        setSecondsLeft((value) => {
          if (!value || value <= 1) {
            logout();
            return 0;
          }
          return value - 1;
        });
      }, 1000);
    }

    function reset() {
      clearTimers();
      if (!mountedRef.current) return;
      setSecondsLeft(null);
      timerRef.current = setTimeout(startCountdown, TIMEOUT_MS - WARNING_MS);
    }

    const events = ["click", "keydown", "mousemove", "scroll", "touchstart"];
    supabase.auth.getSession().then(({ data }) => {
      if (!mountedRef.current || !data.session) return;
      events.forEach((event) => window.addEventListener(event, reset, { passive: true }));
      reset();
    });

    return () => {
      mountedRef.current = false;
      clearTimers();
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, []);

  if (secondsLeft === null) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <h2 className="text-xl font-bold text-secondary">Session Timeout</h2>
        <p className="mt-2 text-sm text-gray-600">
          You will be logged out in {secondsLeft} seconds due to inactivity.
        </p>
        <button
          className="mt-5 rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white"
          onClick={() => {
            if (mountedRef.current) {
              setSecondsLeft(null);
            }
            window.dispatchEvent(new Event("mousemove"));
          }}
        >
          Stay Signed In
        </button>
      </div>
    </div>
  );
}
