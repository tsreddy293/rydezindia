import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";

export type NotificationType =
  | "new_booking"
  | "booking_confirmed"
  | "booking_cancelled"
  | "vehicle_approved"
  | "vehicle_pending_approval"
  | "vehicle_rejected"
  | "vehicle_reupload_requested"
  | "owner_approved"
  | "payment_received"
  | "refund_processed";

function isMissingTableError(error: { message?: string } | null): boolean {
  if (!error?.message) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("could not find the table") || msg.includes("does not exist");
}

export async function createNotification(input: {
  recipientId?: string | null;
  recipientRole?: UserRole | "system" | "admin";
  actorId?: string | null;
  actorRole?: UserRole | "system";
  type: NotificationType | string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("notifications")
    .insert({
      recipient_id: input.recipientId || null,
      recipient_role: input.recipientRole || null,
      actor_id: input.actorId || null,
      actor_role: input.actorRole || null,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      console.warn("[createNotification] notifications table missing — skipping");
      return null;
    }
    console.warn("[createNotification]", error.message);
    return null;
  }

  revalidatePath("/admin");
  revalidatePath("/owner/dashboard");
  return data.id as string;
}

export async function listNotifications(input?: {
  recipientId?: string;
  recipientRole?: string;
  limit?: number;
}) {
  const db = createAdminClient();
  let query = db
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(input?.limit ?? 25);

  if (input?.recipientId) query = query.eq("recipient_id", input.recipientId);
  if (input?.recipientRole) query = query.eq("recipient_role", input.recipientRole);

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return [];
    return [];
  }
  return data ?? [];
}

export async function markNotificationRead(id: string) {
  const db = createAdminClient();
  const { error } = await db
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error && !isMissingTableError(error)) {
    console.warn("[markNotificationRead]", error.message);
  }
}
