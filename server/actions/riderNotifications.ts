"use server";

import { revalidatePath } from "next/cache";
import { markNotificationRead } from "@/lib/services/notifications";
import { requireRole } from "@/server/actions/auth";

export async function markRiderNotificationRead(id: string) {
  const { user } = await requireRole("user");
  await markNotificationRead(id, user.id);
  revalidatePath("/dashboard");
}
