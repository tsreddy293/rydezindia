"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { submitOwnerProfileKyc } from "@/server/actions/ownerKyc";

/** @deprecated Use submitOwnerProfileKyc via /owner/kyc */
export async function submitOwnerKyc(formData: FormData) {
  const result = await submitOwnerProfileKyc(formData);
  if (!result.success) {
    throw new Error(result.error ?? "KYC submission failed");
  }
  revalidatePath("/owner/dashboard");
  redirect("/owner/kyc");
}
