"use server";

import { revalidatePath } from "next/cache";
import { markNotificationRead as markRead } from "@/lib/services/notifications";

export async function markAdminNotificationRead(id: string) {
  await markRead(id);
  revalidatePath("/admin");
  revalidatePath("/admin/notifications");
}

export async function markAllAdminNotificationsRead(ids: string[]) {
  for (const id of ids) {
    await markRead(id);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/notifications");
}
