import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "vehicle-assets";

export type VehicleDocumentType = "rc" | "insurance" | "pollution" | "fitness";

export async function uploadVehicleFile(
  ownerId: string,
  vehicleId: string,
  folder: "images" | VehicleDocumentType,
  file: File
): Promise<string> {
  const db = createAdminClient();
  const ext = file.name.split(".").pop() || "bin";
  const path = `${ownerId}/${vehicleId}/${folder}-${Date.now()}.${ext}`;

  const { error } = await db.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });

  if (error) throw new Error(error.message);

  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function saveVehicleImages(vehicleId: string, urls: string[]) {
  const db = createAdminClient();
  if (urls.length === 0) return;

  await db.from("vehicle_images").delete().eq("vehicle_id", vehicleId);

  const rows = urls.map((url, index) => ({
    vehicle_id: vehicleId,
    image_url: url,
    sort_order: index,
  }));

  const { error } = await db.from("vehicle_images").insert(rows);
  if (error && !error.message.includes("does not exist")) throw new Error(error.message);
}

export async function saveVehicleDocument(
  vehicleId: string,
  documentType: VehicleDocumentType,
  url: string
) {
  const db = createAdminClient();
  const { error } = await db.from("vehicle_documents").upsert(
    {
      vehicle_id: vehicleId,
      document_type: documentType,
      document_url: url,
    },
    { onConflict: "vehicle_id,document_type" }
  );

  if (error && !error.message.includes("does not exist")) throw new Error(error.message);
}

export async function getVehicleImages(vehicleId: string): Promise<string[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("vehicle_images")
    .select("image_url")
    .eq("vehicle_id", vehicleId)
    .order("sort_order", { ascending: true });

  if (error) return [];
  return (data ?? []).map((row) => String((row as { image_url: string }).image_url));
}

export async function getVehicleDocuments(
  vehicleId: string
): Promise<Record<VehicleDocumentType, string | null>> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("vehicle_documents")
    .select("document_type, document_url")
    .eq("vehicle_id", vehicleId);

  const result: Record<VehicleDocumentType, string | null> = {
    rc: null,
    insurance: null,
    pollution: null,
    fitness: null,
  };

  if (error) return result;

  for (const row of data ?? []) {
    const typed = row as { document_type: VehicleDocumentType; document_url: string };
    result[typed.document_type] = typed.document_url;
  }

  return result;
}
