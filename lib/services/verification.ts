import { createAdminClient } from "@/lib/supabase/admin";
import { getCustomerKyc } from "@/lib/services/customer-kyc";

export async function isOwnerKycVerified(ownerId: string): Promise<boolean> {
  const db = createAdminClient();
  const { data } = await db
    .from("owner_kyc")
    .select("status")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if ((data as { status?: string } | null)?.status === "approved") return true;

  const { data: owner } = await db
    .from("owners")
    .select("kyc_verified")
    .eq("id", ownerId)
    .maybeSingle();
  return Boolean((owner as { kyc_verified?: boolean } | null)?.kyc_verified);
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
  const status = (kyc as { status?: string } | null)?.status ?? "not_submitted";
  if (status === "verified") return null;
  if (status === "pending") {
    return "Your KYC verification is pending. You can book once verified.";
  }
  if (status === "rejected") {
    return "Your KYC was rejected. Please re-upload documents at /user/profile/kyc.";
  }
  return null; // allow booking without KYC for now; set to require KYC by uncommenting below
  // return "Please complete KYC verification at /user/profile/kyc before booking.";
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
