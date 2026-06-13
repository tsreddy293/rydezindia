/**
 * Centralized Supabase environment configuration.
 * Server: uses service role key when available (bypasses RLS).
 * Client: uses anon/publishable key only.
 */

function trim(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getSupabaseUrl(): string {
  const url = trim(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing. Add it to .env.local and restart the dev server."
    );
  }
  return url;
}

export function getSupabaseAnonKey(): string {
  const key = trim(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!key || key.includes("YOUR_") || key === "YOUR_PUBLISHABLE_KEY") {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or still a placeholder. Update .env.local and restart npm run dev."
    );
  }
  return key;
}

export function getSupabaseServiceKey(): string {
  const key = trim(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!key || key.includes("YOUR_") || key === "YOUR_SECRET_KEY") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing or still a placeholder. Update .env.local and restart npm run dev."
    );
  }
  return key;
}

/** Dev-only connection diagnostics (server-side) */
export function logSupabaseConfig(context: string) {
  if (process.env.NODE_ENV !== "development") return;

  const url = trim(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anon = trim(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const service = trim(process.env.SUPABASE_SERVICE_ROLE_KEY);

  console.log(`[Supabase:${context}] URL loaded:`, !!url, url?.slice(0, 30));
  console.log(`[Supabase:${context}] Anon key loaded:`, !!anon, anon?.slice(0, 12) + "...");
  console.log(`[Supabase:${context}] Service key loaded:`, !!service, service?.slice(0, 10) + "...");
}

export function isSupabaseConfigured(): boolean {
  try {
    getSupabaseUrl();
    getSupabaseServiceKey();
    return true;
  } catch {
    return false;
  }
}

export function getSupabaseConfigError(): string | null {
  try {
    getSupabaseUrl();
    getSupabaseAnonKey();
    getSupabaseServiceKey();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Supabase is not configured";
  }
}
