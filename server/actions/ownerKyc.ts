"use server";

import { revalidatePath } from "next/cache";
import { ownerKycCanApprove, resolveOwnerKycDisplayStatus } from "@/lib/admin/owner-kyc";
import {
  getOwnerProfileKyc,
  ownerProfileDocumentsToSet,
  uploadOwnerProfileKycFile,
  upsertOwnerProfileKycDocuments,
} from "@/lib/services/owner-profile-kyc";
import { createNotification } from "@/lib/services/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/server/actions/auth";
import type { ActionResult } from "@/types/database";

async function uploadIfPresent(
  ownerId: string,
  formData: FormData,
  name: string,
  field: "aadhaar_document_url" | "license_document_url" | "selfie_document_url" | "address_proof_url"
) {
  const file = formData.get(name);
  if (!(file instanceof File) || file.size === 0) return undefined;
  return uploadOwnerProfileKycFile(ownerId, field, file);
}

export async function getOwnerKycStatus() {
  const { user } = await requireRole("owner");
  const db = createAdminClient();

  const [profile, userRow] = await Promise.all([
    getOwnerProfileKyc(user.id),
    db.from("users").select("kyc_status").eq("id", user.id).maybeSingle(),
  ]);

  const userKycStatus = String(
    (userRow.data as { kyc_status?: string } | null)?.kyc_status ?? "not_submitted"
  );
  const documents = ownerProfileDocumentsToSet(profile);
  const hasRequiredDocs = ownerKycCanApprove(documents);
  const status = resolveOwnerKycDisplayStatus({
    userKycStatus,
    profileKycStatus: profile?.kyc_status,
    kycSubmittedAt: profile?.kyc_submitted_at,
    hasRequiredDocs,
  });

  return {
    status,
    documents,
    profile,
    hasRequiredDocs,
    canSubmit: status !== "verified",
  };
}

export async function submitOwnerProfileKyc(formData: FormData): Promise<ActionResult> {
  const { user } = await requireRole("owner");
  const ownerId = user.id;

  try {
    const existing = await getOwnerProfileKyc(ownerId);
    const aadhaarUrl = await uploadIfPresent(ownerId, formData, "aadhaar", "aadhaar_document_url");
    const licenseUrl = await uploadIfPresent(ownerId, formData, "license", "license_document_url");
    const selfieUrl = await uploadIfPresent(ownerId, formData, "selfie", "selfie_document_url");
    const addressProofUrl = await uploadIfPresent(
      ownerId,
      formData,
      "address_proof",
      "address_proof_url"
    );

    if (!aadhaarUrl && !existing?.aadhaar_document_url) {
      return { success: false, error: "Aadhaar document is required" };
    }
    if (!licenseUrl && !existing?.license_document_url) {
      return { success: false, error: "Driving License document is required" };
    }

    await upsertOwnerProfileKycDocuments({
      userId: ownerId,
      aadhaarUrl: aadhaarUrl ?? existing?.aadhaar_document_url ?? undefined,
      licenseUrl: licenseUrl ?? existing?.license_document_url ?? undefined,
      selfieUrl: selfieUrl ?? existing?.selfie_document_url ?? undefined,
      addressProofUrl: addressProofUrl ?? existing?.address_proof_url ?? undefined,
    });

    await createNotification({
      recipientRole: "admin",
      actorId: ownerId,
      actorRole: "owner",
      type: "owner_kyc_submitted",
      title: "Owner KYC submitted",
      message: "An owner submitted KYC documents for review.",
      metadata: { ownerId },
    });

    revalidatePath("/owner/kyc");
    revalidatePath("/owner/profile");
    revalidatePath("/owner/dashboard");
    revalidatePath("/admin/kyc");

    return { success: true, message: "KYC documents submitted for admin review." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload KYC documents";
    if (message.includes("Bucket not found")) {
      return {
        success: false,
        error: "Storage not configured. Run supabase/RUN_OWNER_PROFILE_KYC.sql in Supabase.",
      };
    }
    return { success: false, error: message };
  }
}
