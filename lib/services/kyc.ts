import { createAdminClient } from "@/lib/supabase/admin";

export type KycDocumentKey =
  | "aadhaar_url"
  | "pan_url"
  | "license_url"
  | "rc_url"
  | "insurance_url"
  | "selfie_url";

const BUCKET = "owner-kyc";

export async function uploadOwnerKycFile(ownerId: string, key: KycDocumentKey, file: File) {
  const db = createAdminClient();
  const ext = file.name.split(".").pop() || "bin";
  const path = `${ownerId}/${key}-${Date.now()}.${ext}`;
  const { error } = await db.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });

  if (error) throw new Error(error.message);
  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function upsertOwnerKyc(input: {
  ownerId: string;
  aadhaarUrl?: string;
  panUrl?: string;
  licenseUrl?: string;
  rcUrl?: string;
  insuranceUrl?: string;
  selfieUrl?: string;
  vehiclePhotos?: string[];
}) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("owner_kyc")
    .upsert({
      owner_id: input.ownerId,
      aadhaar_url: input.aadhaarUrl || null,
      pan_url: input.panUrl || null,
      license_url: input.licenseUrl || null,
      rc_url: input.rcUrl || null,
      insurance_url: input.insuranceUrl || null,
      selfie_url: input.selfieUrl || null,
      vehicle_photos: input.vehiclePhotos ?? [],
      status: "pending",
      reupload_requested: false,
      reupload_reason: null,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function listOwnerKyc(status?: string) {
  const db = createAdminClient();
  let query = db.from("owner_kyc").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return [];
  return data ?? [];
}
