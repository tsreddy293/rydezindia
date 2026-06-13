import { createAdminClient } from "@/lib/supabase/admin";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

export async function getReportRows(type: string) {
  const db = createAdminClient();

  if (type === "payments") {
    const { data } = await db
      .from("payments")
      .select("id, booking_id, razorpay_order_id, razorpay_payment_id, amount, currency, status, created_at")
      .order("created_at", { ascending: false });
    return (data ?? []) as Record<string, unknown>[];
  }

  if (type === "owners") {
    const { data } = await db
      .from("owners")
      .select("id, owner_name, mobile, email, verification_status, created_at")
      .order("created_at", { ascending: false });
    return (data ?? []) as Record<string, unknown>[];
  }

  if (type === "vehicles") {
    const { data } = await db
      .from("vehicles")
      .select("id, owner_id, vehicle_name, vehicle_type, vehicle_number, vehicle_approval_status, status, created_at")
      .order("created_at", { ascending: false });
    return (data ?? []) as Record<string, unknown>[];
  }

  const { data } = await db
    .from("bookings")
    .select("id, booking_type, user_id, owner_id, amount, booking_status, payment_status, created_at")
    .order("created_at", { ascending: false });
  return (data ?? []) as Record<string, unknown>[];
}
