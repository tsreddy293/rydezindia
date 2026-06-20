"use server";

import { revalidatePath } from "next/cache";
import {
  customerKycDisplayStatus,
  customerKycHasRequiredDocs,
  readCustomerKycDocuments,
  upsertCustomerKyc,
  getCustomerKyc,
  uploadCustomerKycFile,
} from "@/lib/services/customer-kyc";
import { createNotification } from "@/lib/services/notifications";
import { requireRole } from "@/server/actions/auth";
import type { ActionResult } from "@/types/database";
import type { CustomerKycDocumentSet } from "@/lib/admin/customer-kyc-fields";
import {
  KYC_UPLOAD_RULES,
  validateKycUploadFile,
  type KycUploadField,
} from "@/lib/kyc/upload-rules";
import { markSelfDriveInterest } from "@/lib/services/customer-profile";
import { mapKycStorageError } from "@/lib/kyc/kyc-storage";

export type CustomerKycStatusResult = {
  status: "not_submitted" | "pending" | "approved" | "rejected";
  rawStatus: string;
  kyc: Record<string, unknown> | null;
  documents: CustomerKycDocumentSet;
  hasRequiredDocs: boolean;
  canSubmit: boolean;
  loadError?: string;
};

const EMPTY_KYC_STATUS: CustomerKycStatusResult = {
  status: "not_submitted",
  rawStatus: "not_submitted",
  kyc: null,
  documents: {},
  hasRequiredDocs: false,
  canSubmit: true,
};

async function uploadIfPresent(userId: string, formData: FormData, name: string, key: string) {
  const file = formData.get(name);
  if (!(file instanceof File) || file.size === 0) return undefined;

  const fieldMap: Record<string, KycUploadField> = {
    aadhaar_front: "aadhaar_front",
    aadhaar_back: "aadhaar_back",
    driving_license: "driving_license",
    selfie: "selfie",
  };
  const field = fieldMap[name];
  if (field) {
    const validationError = validateKycUploadFile(file, field);
    if (validationError) throw new Error(validationError);
  }

  return uploadCustomerKycFile(userId, key, file);
}

export async function getCustomerKycStatus(userId?: string): Promise<CustomerKycStatusResult> {
  try {
    const resolvedUserId = userId ?? (await requireRole("user")).user.id;
    const kyc = await getCustomerKyc(resolvedUserId);
    const documents = readCustomerKycDocuments(kyc);
    const rawStatus = (kyc?.status as string | undefined) ?? "not_submitted";
    const status = customerKycDisplayStatus(rawStatus, documents);
    const hasRequiredDocs = customerKycHasRequiredDocs(documents);

    return {
      status,
      rawStatus,
      kyc,
      documents,
      hasRequiredDocs,
      canSubmit: status !== "approved",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load KYC status";
    console.error("[getCustomerKycStatus]", error);
    return {
      ...EMPTY_KYC_STATUS,
      loadError: message,
    };
  }
}

export async function submitCustomerKyc(formData: FormData): Promise<ActionResult> {
  try {
    const { user } = await requireRole("user");
    const userId = user.id;

    const existing = await getCustomerKyc(userId);
    const prev = readCustomerKycDocuments(existing);

    const aadhaarFrontUrl =
      (await uploadIfPresent(userId, formData, "aadhaar_front", "aadhaar-front")) ?? prev.aadhaar_front_url;
    const aadhaarBackUrl =
      (await uploadIfPresent(userId, formData, "aadhaar_back", "aadhaar-back")) ?? prev.aadhaar_back_url;
    const drivingLicenseUrl =
      (await uploadIfPresent(userId, formData, "driving_license", "driving-license")) ??
      prev.driving_license_url;
    const selfieUrl = (await uploadIfPresent(userId, formData, "selfie", "selfie")) ?? prev.selfie_url;

    const merged: CustomerKycDocumentSet = {
      aadhaar_front_url: aadhaarFrontUrl,
      aadhaar_back_url: aadhaarBackUrl,
      driving_license_url: drivingLicenseUrl,
      selfie_url: selfieUrl,
    };

    if (!customerKycHasRequiredDocs(merged)) {
      return {
        success: false,
        error: "Aadhaar Front, Aadhaar Back, and Driving License are required.",
      };
    }

    await upsertCustomerKyc({
      userId,
      aadhaarFrontUrl,
      aadhaarBackUrl,
      drivingLicenseUrl,
      selfieUrl,
    });

    await markSelfDriveInterest(userId);

    await createNotification({
      recipientRole: "admin",
      actorId: userId,
      actorRole: "rider",
      type: "customer_kyc_submitted",
      title: "Rider KYC submitted",
      message: "A rider submitted KYC documents for review.",
      metadata: { userId },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/kyc");
    revalidatePath("/user/profile/kyc");
    revalidatePath("/user/dashboard/verification");
    revalidatePath("/admin/customer-management");

    return { success: true, message: "KYC documents submitted. Status is now Pending — admin will review shortly." };
  } catch (error) {
    const message = mapKycStorageError(error);
    console.error("[submitCustomerKyc]", error);
    return { success: false, error: message };
  }
}
