import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "customer-kyc";

export type CustomerKycStatus = "not_submitted" | "pending" | "verified" | "rejected";

export async function uploadCustomerKycFile(userId: string, key: string, file: File) {
  const db = createAdminClient();
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${key}-${Date.now()}.${ext}`;
  const { error } = await db.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw new Error(error.message);
  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function getCustomerKyc(userId: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("customer_kyc")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error?.message?.includes("does not exist")) return null;
  if (error) throw new Error(error.message);
  return data;
}

export async function upsertCustomerKyc(input: {
  userId: string;
  aadhaarUrl?: string;
  licenseUrl?: string;
  selfieUrl?: string;
}) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("customer_kyc")
    .upsert(
      {
        user_id: input.userId,
        aadhaar_url: input.aadhaarUrl ?? undefined,
        license_url: input.licenseUrl ?? undefined,
        selfie_url: input.selfieUrl ?? undefined,
        status: "pending",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await db.from("users").update({ kyc_status: "pending" }).eq("id", input.userId);
  return data;
}

export async function listCustomerKyc(status?: string) {
  const db = createAdminClient();
  let query = db.from("customer_kyc").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return [];
  return data ?? [];
}

export async function isCustomerKycVerified(userId: string): Promise<boolean> {
  const kyc = await getCustomerKyc(userId);
  if (kyc) return (kyc as { status: string }).status === "verified";
  const db = createAdminClient();
  const { data } = await db.from("users").select("kyc_status").eq("id", userId).maybeSingle();
  return (data as { kyc_status?: string } | null)?.kyc_status === "verified";
}
