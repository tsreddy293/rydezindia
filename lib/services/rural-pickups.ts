import { createAdminClient } from "@/lib/supabase/admin";

export async function listRuralPickupPoints(village?: string) {
  const db = createAdminClient();
  let query = db
    .from("rural_pickup_points")
    .select("*")
    .eq("is_active", true)
    .order("village", { ascending: true });

  if (village) query = query.ilike("village", `%${village}%`);

  const { data, error } = await query;
  if (error) return [];
  return data ?? [];
}

export async function getRuralVillages() {
  const db = createAdminClient();
  const { data } = await db
    .from("rural_pickup_points")
    .select("village")
    .eq("is_active", true);

  const villages = [...new Set((data ?? []).map((r) => String((r as { village: string }).village)))];
  return villages.sort();
}

export const RURAL_VILLAGES = [
  "Kakinada",
  "Samalkot",
  "Peddapuram",
  "Mandapeta",
  "Amalapuram",
  "Rajahmundry",
];
