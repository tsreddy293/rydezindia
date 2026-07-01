import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Max wait before treating an auth check as failed and sending the user to login. */
export const BOOKING_AUTH_TIMEOUT_MS = 2000;

type MinimalSupabase = Pick<SupabaseClient, "auth">;

/**
 * Validates the current Supabase session (server-checked getUser).
 * Returns null on missing session, error, or timeout.
 */
export async function verifyBookingSession(
  supabase: MinimalSupabase,
  timeoutMs = BOOKING_AUTH_TIMEOUT_MS
): Promise<User | null> {
  try {
    const user = await Promise.race<User | null>([
      supabase.auth.getUser().then(({ data, error }) => {
        if (error || !data.user) return null;
        return data.user;
      }),
      new Promise<null>((resolve) => {
        window.setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
    return user;
  } catch {
    return null;
  }
}

export function resolveClientBookingReturnPath(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return window.location.pathname + window.location.search;
}
