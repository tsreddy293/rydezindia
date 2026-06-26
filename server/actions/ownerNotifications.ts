"use server";

import { revalidatePath } from "next/cache";
import { markNotificationRead } from "@/lib/services/notifications";
import { requireRole } from "@/server/actions/auth";

export async function markOwnerNotificationRead(id: string) {
  const { user } = await requireRole("owner");
  await markNotificationRead(id, user.id);
  revalidatePath("/owner/dashboard");
  revalidatePath("/owner/notifications");
}

export async function markAllOwnerNotificationsRead(ids: string[]) {
  const { user } = await requireRole("owner");
  for (const id of ids) {
    await markNotificationRead(id, user.id);
  }
  revalidatePath("/owner/dashboard");
  revalidatePath("/owner/notifications");
}
