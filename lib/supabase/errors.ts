export function isMissingTableError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("could not find the table") ||
    error.message?.toLowerCase().includes("does not exist")
  );
}

export function isInvalidUserRoleEnumError(
  error: { message?: string } | null | undefined
): boolean {
  if (!error?.message) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("user_role") || (msg.includes("enum") && msg.includes("role"));
}

export function isMissingColumnError(
  error: { message?: string } | null | undefined,
  ...columns: string[]
): boolean {
  if (!error?.message) return false;
  const msg = error.message.toLowerCase();
  const columnError =
    msg.includes("column") || msg.includes("schema cache") || msg.includes("could not find");
  if (!columnError) return false;
  if (columns.length === 0) return true;
  return columns.some((column) => msg.includes(column.toLowerCase()));
}
