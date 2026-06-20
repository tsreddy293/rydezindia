"use server";

import { markSelfDriveInterest } from "@/lib/services/customer-profile";
import { requireRole } from "@/server/actions/auth";

/** Record that a rider showed interest in self-drive (search or booking attempt). */
export async function recordSelfDriveInterestAction(): Promise<{ success: boolean }> {
  try {
    const { user } = await requireRole("user");
    await markSelfDriveInterest(user.id);
    return { success: true };
  } catch {
    return { success: false };
  }
}

/** Same as above but accepts userId when auth already verified server-side. */
export async function recordSelfDriveInterestForUser(userId: string): Promise<void> {
  await markSelfDriveInterest(userId);
}
