import { createAdminClient } from "@/lib/supabase/admin";
import { getCustomerKyc } from "@/lib/services/customer-kyc";
import { normalizeCustomerKycStatus } from "@/lib/admin/customer-kyc-fields";
import { ownerProfileDocumentsToSet, getOwnerProfileKyc } from "@/lib/services/owner-profile-kyc";
import { fetchBookingOwnerProfileState } from "@/lib/services/owner-approval-sync";

export type OwnerBookingGateDebug = {
  ownerId: string;
  vehicleId?: string;
  ownerProfileFound: boolean;
  ownerProfileOwnerStatus: string | null;
  ownerProfileKycStatus: string | null;
  resolvedOwnerStatus: string;
  resolvedKycStatus: string;
  ownerApproved: boolean;
  kycApproved: boolean;
  approvalStatus: string | null;
  vehicleApproved: boolean;
  vehicleCheckSkipped: boolean;
};

function approvalStatusFromRow(row: Record<string, unknown> | null): string {
  if (!row) return "not_found";
  const value = row.approval_status;
  return value === null || value === undefined ? "unknown" : String(value).toLowerCase().trim();
}

/** Booking gate — vehicles.owner_id → owner_profiles; vehicle uses approval_status only. */
export async function fetchOwnerBookingGateSnapshot(
  ownerId: string,
  vehicleId?: string
): Promise<OwnerBookingGateDebug> {
  const profileState = await fetchBookingOwnerProfileState(vehicleId, ownerId);

  const db = createAdminClient();
  const vehicleResult = vehicleId
    ? await db.from("vehicles").select("id, owner_id, approval_status").eq("id", vehicleId).maybeSingle()
    : { data: null, error: null };

  let approvalStatus: string | null = null;
  let vehicleApproved = true;
  const vehicleCheckSkipped = !vehicleId;

  if (vehicleId && vehicleResult.data) {
    const vehicleRow = vehicleResult.data as Record<string, unknown>;
    approvalStatus = approvalStatusFromRow(vehicleRow);
    vehicleApproved = approvalStatus === "approved";
  } else if (vehicleId && !vehicleResult.data) {
    approvalStatus = "not_found";
    vehicleApproved = false;
  }

  return {
    ownerId: profileState.ownerId || ownerId,
    vehicleId,
    ownerProfileFound: profileState.profileFound,
    ownerProfileOwnerStatus: profileState.profileFound ? profileState.ownerStatus : null,
    ownerProfileKycStatus: profileState.profileFound ? profileState.kycStatus : null,
    resolvedOwnerStatus: profileState.ownerStatus,
    resolvedKycStatus: profileState.kycStatus,
    ownerApproved: profileState.ownerApproved,
    kycApproved: profileState.kycApproved,
    approvalStatus,
    vehicleApproved,
    vehicleCheckSkipped,
  };
}

export async function isOwnerKycVerified(ownerId: string, vehicleId?: string): Promise<boolean> {
  const state = await fetchBookingOwnerProfileState(vehicleId, ownerId);
  return state.ownerApproved && state.kycApproved;
}

export async function assertOwnerCanReceiveBookings(
  ownerId: string,
  vehicleId?: string
): Promise<string | null> {
  const snapshot = await fetchOwnerBookingGateSnapshot(ownerId, vehicleId);

  console.log("Vehicle ID:", vehicleId ?? "—");
  console.log("Owner ID:", snapshot.ownerId || ownerId || "—");
  console.log("Owner Status:", snapshot.resolvedOwnerStatus);
  console.log("KYC Status:", snapshot.resolvedKycStatus);
  console.log("Vehicle approval_status:", snapshot.approvalStatus ?? "—");
  console.log("[assertOwnerCanReceiveBookings] snapshot", JSON.stringify(snapshot, null, 2));

  if (!snapshot.ownerId) {
    return "Vehicle owner could not be resolved. Contact support.";
  }

  if (!snapshot.ownerProfileFound) {
    console.warn("[assertOwnerCanReceiveBookings] BLOCKED no owner_profiles row", {
      vehicleId,
      ownerId: snapshot.ownerId,
    });
    return `This owner is not approved yet (owner_status=${snapshot.resolvedOwnerStatus}). Contact support if admin already approved this owner.`;
  }

  if (!snapshot.ownerApproved) {
    console.warn("[assertOwnerCanReceiveBookings] BLOCKED owner_status", {
      vehicleId,
      ownerId: snapshot.ownerId,
      resolvedOwnerStatus: snapshot.resolvedOwnerStatus,
      ownerProfileOwnerStatus: snapshot.ownerProfileOwnerStatus,
    });
    return `This owner is not approved yet (owner_status=${snapshot.resolvedOwnerStatus}). Contact support if admin already approved this owner.`;
  }

  if (!snapshot.kycApproved) {
    console.warn("[assertOwnerCanReceiveBookings] BLOCKED kyc_status", {
      ownerId: snapshot.ownerId,
      resolvedKycStatus: snapshot.resolvedKycStatus,
      ownerProfileKycStatus: snapshot.ownerProfileKycStatus,
    });
    return `This owner is not verified yet. Bookings cannot be placed until KYC is approved (kyc_status=${snapshot.resolvedKycStatus}).`;
  }

  if (vehicleId && !snapshot.vehicleApproved) {
    console.warn("[assertOwnerCanReceiveBookings] BLOCKED approval_status", {
      ownerId: snapshot.ownerId,
      vehicleId,
      approvalStatus: snapshot.approvalStatus,
    });
    return `This vehicle is not approved for booking (approval_status=${snapshot.approvalStatus ?? "unknown"}).`;
  }

  console.log("[assertOwnerCanReceiveBookings] ALLOWED", {
    vehicleId,
    ownerId: snapshot.ownerId,
    approvalStatus: snapshot.approvalStatus,
  });
  return null;
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
