/** Prefer `name`; fall back to legacy `full_name` when present. */
export function resolveUserName(
  user: { name?: string | null; full_name?: string | null } | null | undefined,
  fallback = ""
): string {
  if (!user) return fallback;
  const resolved = String(user.name ?? user.full_name ?? "").trim();
  return resolved || fallback;
}
