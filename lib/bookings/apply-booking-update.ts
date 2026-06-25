import type { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumnError } from "@/lib/supabase/errors";

type DbClient = ReturnType<typeof createAdminClient>;

const COLUMN_ALIASES: Record<string, string> = {
  cancellation_reason: "cancel_reason",
};

function missingColumnFromError(message: string): string | null {
  const quoted = message.match(/'([^']+)'\s+column/i);
  if (quoted?.[1]) return quoted[1];
  const bare = message.match(/column\s+bookings\.([a-z0-9_]+)\s+does not exist/i);
  return bare?.[1] ?? null;
}

/**
 * Updates a booking row, dropping unknown columns or mapping to legacy aliases
 * (e.g. cancellation_reason → cancel_reason) when the schema is behind migrations.
 */
export async function applyBookingUpdateWithColumnFallback(
  db: DbClient,
  bookingId: string,
  payload: Record<string, unknown>
): Promise<{ error: string | null }> {
  const current: Record<string, unknown> = { ...payload };
  const maxAttempts = Object.keys(current).length + 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { error } = await db.from("bookings").update(current).eq("id", bookingId);
    if (!error) return { error: null };
    if (!isMissingColumnError(error)) return { error: error.message ?? "Update failed" };

    const missing = missingColumnFromError(error.message ?? "");
    if (!missing) return { error: error.message ?? "Update failed" };

    if (missing in current) {
      const value = current[missing];
      delete current[missing];
      const alias = COLUMN_ALIASES[missing];
      if (alias && !(alias in current) && value !== undefined) {
        current[alias] = value;
      }
      continue;
    }

    return { error: error.message ?? "Update failed" };
  }

  return { error: "Update failed after column fallback" };
}
