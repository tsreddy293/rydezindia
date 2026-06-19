"use server";

import { revalidatePath } from "next/cache";
import { ownerKycCanApprove } from "@/lib/admin/owner-kyc";
import { normalizeProfileStatus, profileKycIsApproved } from "@/lib/admin/owner-profile-fields";
import {
  getOwnerProfileKyc,
  ownerProfileDocumentsToSet,
  uploadOwnerProfileKycFile,
  upsertOwnerProfileKycDocuments,
} from "@/lib/services/owner-profile-kyc";
import { createNotification } from "@/lib/services/notifications";
import { requireRole } from "@/server/actions/auth";
import type { ActionResult } from "@/types/database";

const OWNER_ACCOUNT_PENDING_MESSAGE =
  "Your owner account must be approved by admin before adding vehicles.";

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
  const profile = await getOwnerProfileKyc(user.id);
  const documents = ownerProfileDocumentsToSet(profile);
  const hasRequiredDocs = ownerKycCanApprove(documents);
  const kycStatus = normalizeProfileStatus(profile?.kyc_status, "pending");
  const ownerStatus = normalizeProfileStatus(profile?.owner_status, "pending");

  const status =
    kycStatus === "approved"
      ? "verified"
      : kycStatus === "rejected"
        ? "rejected"
        : hasRequiredDocs
          ? "pending"
          : "not_submitted";

  return {
    status,
    kycStatus,
    ownerStatus,
    documents,
    profile,
    hasRequiredDocs,
    canSubmit: kycStatus !== "approved",
    canAddVehicle: kycStatus === "approved" && ownerStatus === "approved",
  };
}

export async function assertOwnerCanCreateVehicle(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { kycStatus, ownerStatus, status } = await getOwnerKycStatus();

  if (status === "rejected" || kycStatus === "rejected") {
    return { ok: false, error: "KYC was rejected. Re-upload documents at /owner/kyc." };
  }

  if (!profileKycIsApproved(kycStatus)) {
    return {
      ok: false,
      error: "Complete KYC verification before adding vehicles. Upload documents at /owner/kyc.",
    };
  }

  if (ownerStatus !== "approved") {
    return { ok: false, error: OWNER_ACCOUNT_PENDING_MESSAGE };
  }

  return { ok: true };
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
    revalidatePath("/admin/owner-management");
    revalidatePath("/admin");

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
