export function isMissingTableError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("could not find the table") ||
    error.message?.toLowerCase().includes("does not exist")
  );
}
