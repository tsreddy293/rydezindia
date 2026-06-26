"use server";

import { revalidatePath } from "next/cache";
import { markNotificationRead as markRead } from "@/lib/services/notifications";
import { requireRole } from "@/server/actions/auth";

export async function markAdminNotificationRead(id: string) {
  await requireRole("admin");
  await markRead(id);
  revalidatePath("/admin");
  revalidatePath("/admin/notifications");
}

export async function markAllAdminNotificationsRead(ids: string[]) {
  await requireRole("admin");
  for (const id of ids) {
    await markRead(id);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/notifications");
}
