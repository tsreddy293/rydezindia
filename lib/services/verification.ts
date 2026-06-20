import { createAdminClient } from "@/lib/supabase/admin";
import { getCustomerKyc } from "@/lib/services/customer-kyc";
import { normalizeCustomerKycStatus } from "@/lib/admin/customer-kyc-fields";
import { ownerProfileDocumentsToSet, getOwnerProfileKyc } from "@/lib/services/owner-profile-kyc";

export async function isOwnerKycVerified(ownerId: string): Promise<boolean> {
  const db = createAdminClient();

  const { data: userRow } = await db
    .from("users")
    .select("kyc_status")
    .eq("id", ownerId)
    .maybeSingle();

  const kycStatus = (userRow as { kyc_status?: string } | null)?.kyc_status;
  if (kycStatus === "verified" || kycStatus === "approved") return true;

  const { data: kyc } = await db
    .from("owner_kyc")
    .select("status")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if ((kyc as { status?: string } | null)?.status === "approved") return true;

  const { data: owner } = await db
    .from("owners")
    .select("kyc_verified")
    .eq("id", ownerId)
    .maybeSingle();
  return Boolean((owner as { kyc_verified?: boolean } | null)?.kyc_verified);
}

export async function getOwnerKycDocumentSet(ownerId: string) {
  const profile = await getOwnerProfileKyc(ownerId);
  const db = createAdminClient();
  const { data: kyc } = await db
    .from("owner_kyc")
    .select("aadhaar_url, license_url, selfie_url")
    .eq("owner_id", ownerId)
    .maybeSingle();

  return ownerProfileDocumentsToSet(profile, {
    aadhaar: (kyc as { aadhaar_url?: string } | null)?.aadhaar_url,
    license: (kyc as { license_url?: string } | null)?.license_url,
    selfie: (kyc as { selfie_url?: string } | null)?.selfie_url,
  });
}

export async function assertOwnerCanReceiveBookings(ownerId: string): Promise<string | null> {
  const verified = await isOwnerKycVerified(ownerId);
  if (!verified) {
    return "This owner is not verified yet. Bookings cannot be placed until KYC is approved.";
  }
  return null;
}

export async function assertCustomerCanBook(userId: string): Promise<string | null> {
  const kyc = await getCustomerKyc(userId);
  const status = normalizeCustomerKycStatus((kyc as { status?: string } | null)?.status);
  if (status === "approved") return null;
  if (status === "pending") {
    return "Your KYC is under review. Self-drive booking will be available once admin approves your documents.";
  }
  if (status === "rejected") {
    const reason = String((kyc as { remarks?: string } | null)?.remarks ?? "").trim();
    return reason
      ? `Your KYC was rejected: ${reason}. Please re-upload documents at /dashboard/kyc.`
      : "Your KYC was rejected. Please re-upload documents at /dashboard/kyc.";
  }
  return "Self-drive vehicles require KYC verification. Upload documents at /dashboard/kyc.";
}

/** Customer KYC is required only for self-drive bookings. Other trip types use OTP only. */
export async function assertCustomerCanBookSelfDrive(userId: string): Promise<string | null> {
  return assertCustomerCanBook(userId);
}

export async function logApproval(input: {
  entityType: string;
  entityId: string;
  action: "approved" | "rejected" | "reupload_requested";
  approvedBy?: string;
  remarks?: string;
}) {
  const db = createAdminClient();
  const { error } = await db.from("approval_logs").insert({
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    approved_by: input.approvedBy ?? null,
    remarks: input.remarks ?? null,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (!msg.includes("could not find the table") && !msg.includes("does not exist")) {
      console.warn("[logApproval]", error.message);
    }
  }
}
