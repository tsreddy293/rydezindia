/** public.users has no updated_at column — strip it from write payloads. */
export function usersWritePayload<T extends Record<string, unknown>>(payload: T): Record<string, unknown> {
  const { updated_at: _removed, ...rest } = payload;
  return rest;
}
