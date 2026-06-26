/** Escape user input for PostgREST `.or()` / `.ilike` filter strings. */
export function escapePostgrestValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function sanitizeSearchQuery(q: string): string {
  return q.replace(/[%_,".()]/g, " ").replace(/\s+/g, " ").trim();
}

export function postgrestIlikePattern(q: string): string {
  const clean = sanitizeSearchQuery(q);
  if (!clean) return "%";
  return `%${escapePostgrestValue(clean)}%`;
}

/** Build a safe `.or()` ilike clause: col.ilike."%term%" */
export function postgrestOrIlike(columns: string[], q: string): string {
  const pattern = postgrestIlikePattern(q);
  return columns.map((col) => `${col}.ilike."${pattern}"`).join(",");
}
