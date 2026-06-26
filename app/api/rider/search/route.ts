import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getRoleForUser } from "@/lib/auth/get-role-for-user";
import { normalizeRole } from "@/lib/auth/roles";

async function assertRiderApi() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const role =
    (await getRoleForUser(data.user.id)) ??
    normalizeRole(data.user.user_metadata?.role) ??
    "rider";
  if (role !== "rider") return null;
  return data.user.id;
}

export async function GET(request: Request) {
  const userId = await assertRiderApi();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json({ results: [] });
  }

  const db = createAdminClient();
  const pattern = `%${q}%`;

  const bookings = await db
    .from("bookings")
    .select("id, booking_reference, passenger_name, pickup_location, drop_location")
    .eq("user_id", userId)
    .or(`booking_reference.ilike.${pattern},pickup_location.ilike.${pattern},drop_location.ilike.${pattern}`)
    .limit(8);

  const results: Array<{ type: string; label: string; sublabel: string; href: string }> = [];

  for (const b of bookings.data ?? []) {
    const row = b as {
      id: string;
      booking_reference?: string;
      pickup_location?: string;
      drop_location?: string;
    };
    results.push({
      type: "Booking",
      label: row.booking_reference ?? row.id.slice(0, 8),
      sublabel: [row.pickup_location, row.drop_location].filter(Boolean).join(" → "),
      href: `/booking/${row.id}`,
    });
  }

  return Response.json({ results });
}
