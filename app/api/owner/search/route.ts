import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getRoleForUser } from "@/lib/auth/get-role-for-user";
import { normalizeRole } from "@/lib/auth/roles";
import { postgrestOrIlike } from "@/lib/services/postgrest-filters";

async function assertOwnerApi() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const role =
    (await getRoleForUser(data.user.id)) ??
    normalizeRole(data.user.user_metadata?.role) ??
    "rider";
  if (role !== "owner") return null;
  return data.user.id;
}

export async function GET(request: Request) {
  const ownerId = await assertOwnerApi();
  if (!ownerId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return Response.json({ results: [] });

  const db = createAdminClient();

  const { data } = await db
    .from("vehicles")
    .select("id, vehicle_make, vehicle_model, registration_number")
    .eq("owner_id", ownerId)
    .or(
      postgrestOrIlike(
        ["registration_number", "vehicle_make", "vehicle_model"],
        q
      )
    )
    .limit(8);

  const results = (data ?? []).map((v) => {
    const row = v as { id: string; vehicle_make?: string; vehicle_model?: string; registration_number?: string };
    return {
      type: "Vehicle",
      label: row.registration_number ?? "Vehicle",
      sublabel: [row.vehicle_make, row.vehicle_model].filter(Boolean).join(" "),
      href: `/owner/view-vehicle/${row.id}`,
    };
  });

  return Response.json({ results });
}
