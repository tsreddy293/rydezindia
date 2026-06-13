"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { uploadOwnerKycFile, upsertOwnerKyc, type KycDocumentKey } from "@/lib/services/kyc";
import { createNotification } from "@/lib/services/notifications";
import { requireRole } from "@/server/actions/auth";

async function uploadIfPresent(ownerId: string, formData: FormData, name: string, key: KycDocumentKey) {
  const file = formData.get(name);
  if (!(file instanceof File) || file.size === 0) return undefined;
  return uploadOwnerKycFile(ownerId, key, file);
}

export async function submitOwnerKyc(formData: FormData) {
  const { user } = await requireRole("owner");
  const ownerId = user.id;
  const aadhaarUrl = await uploadIfPresent(ownerId, formData, "aadhaar", "aadhaar_url");
  const panUrl = await uploadIfPresent(ownerId, formData, "pan", "pan_url");
  const licenseUrl = await uploadIfPresent(ownerId, formData, "license", "license_url");
  const rcUrl = await uploadIfPresent(ownerId, formData, "rc", "rc_url");
  const insuranceUrl = await uploadIfPresent(ownerId, formData, "insurance", "insurance_url");
  const photos = formData.getAll("vehicle_photos");
  const vehiclePhotos: string[] = [];

  for (const photo of photos) {
    if (photo instanceof File && photo.size > 0) {
      vehiclePhotos.push(await uploadOwnerKycFile(ownerId, "rc_url", photo));
    }
  }

  await upsertOwnerKyc({
    ownerId,
    aadhaarUrl,
    panUrl,
    licenseUrl,
    rcUrl,
    insuranceUrl,
    vehiclePhotos,
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

  revalidatePath("/owner/dashboard");
  redirect("/owner/dashboard");
}
