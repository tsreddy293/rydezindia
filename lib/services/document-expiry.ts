import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/services/notifications";

const ALERT_DAYS = [30, 15, 7];

export async function checkDocumentExpiries() {
  const db = createAdminClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: docs, error } = await db
    .from("vehicle_documents")
    .select("id, vehicle_id, document_type, expiry_date, last_alert_days")
    .not("expiry_date", "is", null);

  if (error || !docs) return { alertsSent: 0 };

  let alertsSent = 0;

  for (const doc of docs) {
    const row = doc as {
      id: string;
      vehicle_id: string;
      document_type: string;
      expiry_date: string;
      last_alert_days?: number;
    };
    const expiry = new Date(row.expiry_date);
    const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    for (const alertDay of ALERT_DAYS) {
      if (daysUntil <= alertDay && daysUntil > 0 && (row.last_alert_days ?? 999) > alertDay) {
        const { data: vehicle } = await db
          .from("vehicles")
          .select("owner_id, vehicle_name")
          .eq("id", row.vehicle_id)
          .maybeSingle();

        const ownerId = (vehicle as { owner_id?: string } | null)?.owner_id;
        const vehicleName = (vehicle as { vehicle_name?: string } | null)?.vehicle_name ?? "Vehicle";

        await db.from("document_expiry_alerts").upsert(
          {
            vehicle_id: row.vehicle_id,
            document_type: row.document_type,
            expiry_date: row.expiry_date,
            alert_days_before: alertDay,
            recipient_id: ownerId ?? null,
          },
          { onConflict: "vehicle_id,document_type,alert_days_before,expiry_date" }
        );

        if (ownerId) {
          await createNotification({
            recipientId: ownerId,
            recipientRole: "owner",
            type: "document_expiry",
            title: `${row.document_type.toUpperCase()} expiring in ${daysUntil} days`,
            message: `${vehicleName}: ${row.document_type} certificate expires on ${row.expiry_date}. Please renew.`,
            metadata: { vehicleId: row.vehicle_id, documentType: row.document_type, daysUntil },
          });
        }

        await db
          .from("vehicle_documents")
          .update({ last_alert_days: alertDay })
          .eq("id", row.id);

        alertsSent++;
      }
    }
  }

  return { alertsSent };
}

export async function saveVehicleDocumentWithExpiry(input: {
  vehicleId: string;
  documentType: string;
  documentUrl: string;
  expiryDate?: string;
}) {
  const db = createAdminClient();
  const { error } = await db.from("vehicle_documents").upsert(
    {
      vehicle_id: input.vehicleId,
      document_type: input.documentType,
      document_url: input.documentUrl,
      expiry_date: input.expiryDate ?? null,
      last_alert_days: null,
      verified: false,
    },
    { onConflict: "vehicle_id,document_type" }
  );
  if (error) throw new Error(error.message);
}
