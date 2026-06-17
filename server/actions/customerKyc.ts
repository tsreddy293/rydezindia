"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  uploadCustomerKycFile,
  upsertCustomerKyc,
  getCustomerKyc,
} from "@/lib/services/customer-kyc";
import { createNotification } from "@/lib/services/notifications";
import { requireRole } from "@/server/actions/auth";

async function uploadIfPresent(userId: string, formData: FormData, name: string, key: string) {
  const file = formData.get(name);
  if (!(file instanceof File) || file.size === 0) return undefined;
  return uploadCustomerKycFile(userId, key, file);
}

export async function submitCustomerKyc(formData: FormData) {
  const { user } = await requireRole("user");
  const userId = user.id;

  const existing = await getCustomerKyc(userId);
  const prev = existing as Record<string, string> | null;

  const aadhaarUrl = (await uploadIfPresent(userId, formData, "aadhaar", "aadhaar")) ?? prev?.aadhaar_url;
  const licenseUrl = (await uploadIfPresent(userId, formData, "license", "license")) ?? prev?.license_url;
  const selfieUrl = (await uploadIfPresent(userId, formData, "selfie", "selfie")) ?? prev?.selfie_url;

  await upsertCustomerKyc({ userId, aadhaarUrl, licenseUrl, selfieUrl });

  await createNotification({
    recipientRole: "admin",
    actorId: userId,
    actorRole: "rider",
    type: "customer_kyc_submitted",
    title: "Customer KYC submitted",
    message: "A customer submitted KYC documents for review.",
    metadata: { userId },
  });

  revalidatePath("/user/profile/kyc");
  revalidatePath("/user/dashboard/verification");
  redirect("/user/dashboard/verification?submitted=1");
}

export async function getCustomerKycStatus() {
  const { user } = await requireRole("user");
  const kyc = await getCustomerKyc(user.id);
  if (!kyc) return { status: "not_submitted" as const, kyc: null };
  return { status: (kyc as { status: string }).status, kyc };
}
