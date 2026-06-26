"use server";

import { revalidatePath } from "next/cache";
import {
  customerKycDisplayStatus,
  customerKycHasRequiredDocs,
  readCustomerKycDocuments,
  upsertCustomerKyc,
  getCustomerKyc,
  uploadCustomerKycFile,
  hasCustomerKycRecord,
} from "@/lib/services/customer-kyc";
import { createNotification } from "@/lib/services/notifications";
import { requireRole } from "@/server/actions/auth";
import type { ActionResult } from "@/types/database";
import type { CustomerKycDocumentSet } from "@/lib/admin/customer-kyc-fields";
import {
  validateKycUploadFile,
  type KycUploadField,
} from "@/lib/kyc/upload-rules";
import { resolveCustomerKycStatus } from "@/lib/kyc/resolve-customer-kyc-status";
import { markSelfDriveInterest } from "@/lib/services/customer-profile";
import {
  formatKycFailureForClient,
  KycSubmitError,
  logKycFailure,
  toKycSubmitFailure,
} from "@/lib/kyc/kyc-errors";
import { safeRiderRedirectPath } from "@/lib/kyc/self-drive-nav";

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
    if (validationError) {
      throw new KycSubmitError({
        phase: "validation",
        functionName: "uploadIfPresent",
        message: validationError,
      });
    }
  }

  console.info("[submitCustomerKyc] uploading file", {
    userId,
    formField: name,
    storageKey: key,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  });

  return uploadCustomerKycFile(userId, key, file);
}

export async function getCustomerKycStatus(): Promise<CustomerKycStatusResult> {
  try {
    const { user } = await requireRole("user");
    return resolveCustomerKycStatus(user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load KYC status";
    console.error("[getCustomerKycStatus]", error);
    return {
      ...EMPTY_KYC_STATUS,
      loadError: message,
    };
  }
}

export async function submitCustomerKycForUser(userId: string, formData: FormData): Promise<ActionResult> {
  const { user } = await requireRole("user");
  if (user.id !== userId) {
    return { success: false, error: "Unauthorized" };
  }
  let step = "load_existing";
  try {
    const existing = await getCustomerKyc(userId);
    const prev = readCustomerKycDocuments(hasCustomerKycRecord(existing) ? existing : null);

    step = "storage_upload";
    const aadhaarFrontUrl =
      (await uploadIfPresent(userId, formData, "aadhaar_front", "aadhaar-front")) ?? prev.aadhaar_front_url;
    const aadhaarBackUrl =
      (await uploadIfPresent(userId, formData, "aadhaar_back", "aadhaar-back")) ?? prev.aadhaar_back_url;
    const drivingLicenseUrl =
      (await uploadIfPresent(userId, formData, "driving_license", "driving-license")) ??
      prev.driving_license_url;
    const selfieUrl = (await uploadIfPresent(userId, formData, "selfie", "selfie")) ?? prev.selfie_url;

    step = "validation";
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

    if (!selfieUrl) {
      return { success: false, error: "Selfie photo is required." };
    }

    step = "database_upsert";
    const selfDriveReturn = safeRiderRedirectPath(String(formData.get("redirect") ?? ""));
    await upsertCustomerKyc({
      userId,
      aadhaarFrontUrl,
      aadhaarBackUrl,
      drivingLicenseUrl,
      selfieUrl,
      selfDriveReturnPath: selfDriveReturn,
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

    return { success: true, message: "KYC documents submitted. Status is now Pending." };
  } catch (error) {
    const failure = toKycSubmitFailure(error, "submitCustomerKycForUser");
    logKycFailure("submitCustomerKycForUser", failure);
    return { success: false, error: formatKycFailureForClient(failure) };
  }
}

export async function submitCustomerKyc(formData: FormData): Promise<ActionResult> {
  let step = "auth";
  try {
    step = "auth";
    const { user } = await requireRole("user");
    const userId = user.id;

    console.info("[submitCustomerKyc] start", {
      userId,
      bucket: "customer-kyc",
      fields: ["aadhaar_front", "aadhaar_back", "driving_license", "selfie"],
    });

    step = "load_existing";
    const existing = await getCustomerKyc(userId);
    const prev = readCustomerKycDocuments(hasCustomerKycRecord(existing) ? existing : null);
    console.info("[submitCustomerKyc] existing kyc", {
      userId,
      hasExistingRow: hasCustomerKycRecord(existing),
      prevDocs: {
        front: Boolean(prev.aadhaar_front_url),
        back: Boolean(prev.aadhaar_back_url),
        license: Boolean(prev.driving_license_url),
        selfie: Boolean(prev.selfie_url),
      },
    });

    step = "storage_upload";
    const aadhaarFrontUrl =
      (await uploadIfPresent(userId, formData, "aadhaar_front", "aadhaar-front")) ?? prev.aadhaar_front_url;
    const aadhaarBackUrl =
      (await uploadIfPresent(userId, formData, "aadhaar_back", "aadhaar-back")) ?? prev.aadhaar_back_url;
    const drivingLicenseUrl =
      (await uploadIfPresent(userId, formData, "driving_license", "driving-license")) ??
      prev.driving_license_url;
    const selfieUrl = (await uploadIfPresent(userId, formData, "selfie", "selfie")) ?? prev.selfie_url;

    console.info("[submitCustomerKyc] uploads complete", {
      userId,
      urls: {
        front: Boolean(aadhaarFrontUrl),
        back: Boolean(aadhaarBackUrl),
        license: Boolean(drivingLicenseUrl),
        selfie: Boolean(selfieUrl),
      },
    });

    step = "validation";
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

    step = "database_upsert";
    const selfDriveReturn = safeRiderRedirectPath(String(formData.get("self_drive_return") ?? ""));
    await upsertCustomerKyc({
      userId,
      aadhaarFrontUrl,
      aadhaarBackUrl,
      drivingLicenseUrl,
      selfieUrl,
      selfDriveReturnPath: selfDriveReturn,
    });
    console.info("[submitCustomerKyc] upsert complete", { userId });

    step = "profile_sync";
    await markSelfDriveInterest(userId);

    step = "notification";
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
    const failure = toKycSubmitFailure(error, "submitCustomerKyc");
    logKycFailure("submitCustomerKyc", failure);
    console.error("[submitCustomerKyc] failed at step", step, {
      phase: failure.phase,
      code: failure.code ?? null,
      message: failure.message,
      hint: failure.hint ?? null,
      supabaseResponse: failure.supabaseResponse ?? null,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: formatKycFailureForClient(failure) };
  }
}
