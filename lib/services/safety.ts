import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/services/notifications";
import { dispatchMessage } from "@/lib/services/messaging";

export async function getEmergencyContacts(userId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("emergency_contacts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function upsertEmergencyContacts(input: {
  userId: string;
  contact1Name?: string;
  contact1Phone?: string;
  contact2Name?: string;
  contact2Phone?: string;
}) {
  const db = createAdminClient();
  const { error } = await db.from("emergency_contacts").upsert(
    {
      user_id: input.userId,
      contact1_name: input.contact1Name ?? null,
      contact1_phone: input.contact1Phone ?? null,
      contact2_name: input.contact2Name ?? null,
      contact2_phone: input.contact2Phone ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw new Error(error.message);
}

export async function triggerSos(input: {
  userId: string;
  bookingId?: string;
  latitude?: number;
  longitude?: number;
}) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("sos_events")
    .insert({
      user_id: input.userId,
      booking_id: input.bookingId ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      status: "triggered",
      metadata: { triggeredAt: new Date().toISOString() },
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const contacts = await getEmergencyContacts(input.userId);
  const c = contacts as {
    contact1_phone?: string;
    contact2_phone?: string;
    contact1_name?: string;
    contact2_name?: string;
  } | null;

  const phones = [c?.contact1_phone, c?.contact2_phone].filter(Boolean) as string[];
  for (const phone of phones) {
    await dispatchMessage({
      channel: "sms",
      recipient: phone,
      template: "sos_alert",
      payload: { userId: input.userId, bookingId: input.bookingId, sosId: data.id },
    });
  }

  await createNotification({
    recipientRole: "admin",
    type: "sos_triggered",
    title: "SOS Alert",
    message: `Emergency SOS triggered by user ${input.userId}`,
    metadata: { sosId: data.id, bookingId: input.bookingId },
  });

  return data.id as string;
}
