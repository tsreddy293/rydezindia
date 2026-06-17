import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function findOrCreateGuestUserByMobile(
  db: AdminClient,
  passengerName: string,
  mobile: string,
  options?: { fallbackUserId?: string; failOnError?: boolean }
): Promise<{ userId: string | null; error?: string }> {
  const normalizedMobile = mobile.replace(/\s/g, "");
  const trimmedName = passengerName.trim();

  const { data: existingUser } = await db
    .from("users")
    .select("id")
    .eq("mobile", normalizedMobile)
    .maybeSingle();

  const existingId = (existingUser as { id?: string } | null)?.id;
  if (existingId) return { userId: existingId };

  const insertPayload: Record<string, unknown> = {
    id: crypto.randomUUID(),
    name: trimmedName,
    email: `${normalizedMobile}@rydezindia.guest`,
    mobile: normalizedMobile,
    role: "rider",
  };

  const { data: newUser, error: userError } = await db
    .from("users")
    .insert(insertPayload)
    .select("id")
    .single();

  if (userError) {
    if (options?.fallbackUserId) return { userId: options.fallbackUserId };
    if (options?.failOnError !== false) {
      return { userId: null, error: userError.message };
    }
    return { userId: null, error: userError.message };
  }

  return { userId: (newUser as { id: string }).id };
}
