"use server";

import { revalidatePath } from "next/cache";
import { markNotificationRead } from "@/lib/services/notifications";

export async function markOwnerNotificationRead(id: string) {
  await markNotificationRead(id);
  revalidatePath("/owner/dashboard");
  revalidatePath("/owner/notifications");
}

export async function markAllOwnerNotificationsRead(ids: string[]) {
  for (const id of ids) {
    await markNotificationRead(id);
  }
  revalidatePath("/owner/dashboard");
  revalidatePath("/owner/notifications");
}
