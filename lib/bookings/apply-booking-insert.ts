import type { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumnError } from "@/lib/supabase/errors";
import { BOOKING_ABSENT_COLUMNS } from "@/lib/bookings/production-booking-schema";

type DbClient = ReturnType<typeof createAdminClient>;

function missingColumnFromError(message: string): string | null {
  const quoted = message.match(/'([^']+)'\s+column/i);
  if (quoted?.[1]) return quoted[1];
  const bare = message.match(/column\s+bookings\.([a-z0-9_]+)\s+does not exist/i);
  return bare?.[1] ?? null;
}

/** Inserts a booking row, stripping unknown/absent columns on schema mismatch. */
export async function applyBookingInsertWithColumnFallback(
  db: DbClient,
  payload: Record<string, unknown>
): Promise<{ data: { id: string } | null; error: string | null }> {
  const absent = new Set<string>(BOOKING_ABSENT_COLUMNS);
  let current: Record<string, unknown> = { ...payload };
  for (const key of absent) {
    delete current[key];
  }

  const maxAttempts = Object.keys(current).length + 8;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await db.from("bookings").insert(current).select("id").single();
    if (!error) {
      return { data: data as { id: string }, error: null };
    }
    if (!isMissingColumnError(error)) {
      return { data: null, error: error.message ?? "Insert failed" };
    }

    const missing = missingColumnFromError(error.message ?? "");
    if (!missing || !(missing in current)) {
      return { data: null, error: error.message ?? "Insert failed" };
    }
    delete current[missing];
  }

  return { data: null, error: "Insert failed after column fallback" };
}
