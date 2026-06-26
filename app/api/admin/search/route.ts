import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getRoleForUser } from "@/lib/auth/get-role-for-user";
import { postgrestOrIlike } from "@/lib/services/postgrest-filters";
import { normalizeRole } from "@/lib/auth/roles";

async function assertAdminApi() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const role =
    (await getRoleForUser(data.user.id)) ??
    normalizeRole(data.user.user_metadata?.role) ??
    "rider";
  return role === "admin";
}

export async function GET(request: Request) {
  if (!(await assertAdminApi())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json({ results: [] });
  }

  const db = createAdminClient();

  const [bookings, vehicles, users] = await Promise.all([
    db
      .from("bookings")
      .select("id, booking_reference, passenger_name, mobile")
      .or(postgrestOrIlike(["booking_reference", "passenger_name", "mobile"], q))
      .limit(8),
    db
      .from("vehicles")
      .select("id, vehicle_name, registration_number")
      .or(postgrestOrIlike(["registration_number", "vehicle_name"], q))
      .limit(8),
    db
      .from("users")
      .select("id, name, mobile, email, role")
      .or(postgrestOrIlike(["name", "mobile", "email"], q))
      .limit(8),
  ]);

  const results: Array<{ type: string; label: string; sublabel: string; href: string }> = [];

  for (const b of bookings.data ?? []) {
    const row = b as { id: string; booking_reference?: string; passenger_name?: string; mobile?: string };
    results.push({
      type: "Booking",
      label: row.booking_reference ?? row.id.slice(0, 8),
      sublabel: `${row.passenger_name ?? "Passenger"}${row.mobile ? ` · ${row.mobile}` : ""}`,
      href: `/admin/bookings`,
    });
  }

  for (const v of vehicles.data ?? []) {
    const row = v as { id: string; vehicle_name?: string; registration_number?: string };
    results.push({
      type: "Vehicle",
      label: row.registration_number ?? row.vehicle_name ?? "Vehicle",
      sublabel: row.vehicle_name ?? "",
      href: `/admin/vehicles/${row.id}`,
    });
  }

  for (const u of users.data ?? []) {
    const row = u as { id: string; name?: string; mobile?: string; email?: string; role?: string };
    const isOwner = row.role === "owner";
    results.push({
      type: isOwner ? "Owner" : "Customer",
      label: row.name ?? "User",
      sublabel: row.mobile ?? row.email ?? "",
      href: isOwner ? "/admin/owner-management" : "/admin/customer-management",
    });
  }

  return Response.json({ results: results.slice(0, 12) });
}
