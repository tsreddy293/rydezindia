"use server";

import { revalidatePath } from "next/cache";
import { markNotificationRead } from "@/lib/services/notifications";

export async function markRiderNotificationRead(id: string) {
  await markNotificationRead(id);
  revalidatePath("/dashboard");
}
