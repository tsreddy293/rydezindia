import { createAdminClient } from "@/lib/supabase/admin";
import { getCustomerKyc } from "@/lib/services/customer-kyc";
import { normalizeCustomerKycStatus } from "@/lib/admin/customer-kyc-fields";
import { ownerProfileDocumentsToSet, getOwnerProfileKyc } from "@/lib/services/owner-profile-kyc";
import {
  fetchOwnerApprovalState,
  healOwnerApprovalDrift,
  resolveCanonicalOwnerUserId,
} from "@/lib/services/owner-approval-sync";
import { normalizeDocumentsStatus } from "@/lib/admin/marketplace-gates";

export type OwnerBookingGateDebug = {
  ownerId: string;
  canonicalOwnerId: string;
  vehicleId?: string;
  ownerProfileFound: boolean;
  ownerProfileOwnerStatus: string | null;
  ownerProfileKycStatus: string | null;
  usersOwnerStatus: string | null;
  usersKycStatus: string | null;
  legacyOwnerKycStatus: string | null;
  legacyOwnersKycVerified: boolean | null;
  vehicleApprovalStatus: string | null;
  vehicleDocumentsStatus: string | null;
  resolvedOwnerStatus: string;
  resolvedKycStatus: string;
  ownerApproved: boolean;
  kycApproved: boolean;
  vehicleApproved: boolean;
  documentsApproved: boolean;
  vehicleCheckSkipped: boolean;
};

function vehicleApprovalFromRow(row: Record<string, unknown> | null): string {
  if (!row) return "unknown";
  const status = row.approval_status ?? row.vehicle_approval_status;
  return status === null || status === undefined ? "unknown" : String(status).toLowerCase().trim();
}

/** Fresh read from DB — uses same merged approval state as Admin Owner Management. */
export async function fetchOwnerBookingGateSnapshot(
  ownerId: string,
  vehicleId?: string
): Promise<OwnerBookingGateDebug> {
  const canonicalOwnerId = await resolveCanonicalOwnerUserId(ownerId);
  const approval = await fetchOwnerApprovalState(ownerId);

  const db = createAdminClient();
  const vehicleResult = vehicleId
    ? await db
        .from("vehicles")
        .select("id, owner_id, approval_status, vehicle_approval_status, documents_status")
        .eq("id", vehicleId)
        .maybeSingle()
    : { data: null, error: null };

  let vehicleApprovalStatus: string | null = null;
  let vehicleDocumentsStatus: string | null = null;
  let vehicleApproved = true;
  let documentsApproved = true;
  const vehicleCheckSkipped = !vehicleId;

  if (vehicleId && vehicleResult.data) {
    const vehicleRow = vehicleResult.data as Record<string, unknown>;
    vehicleApprovalStatus = vehicleApprovalFromRow(vehicleRow);
    vehicleDocumentsStatus = String(vehicleRow.documents_status ?? "pending").toLowerCase().trim();
    vehicleApproved = vehicleApprovalStatus === "approved";
    documentsApproved = normalizeDocumentsStatus(vehicleDocumentsStatus) === "approved";
  } else if (vehicleId && !vehicleResult.data) {
    vehicleApprovalStatus = "not_found";
    vehicleDocumentsStatus = "not_found";
    vehicleApproved = false;
    documentsApproved = false;
  }

  return {
    ownerId,
    canonicalOwnerId,
    vehicleId,
    ownerProfileFound: approval.profileFound,
    ownerProfileOwnerStatus: approval.profileOwnerStatus,
    ownerProfileKycStatus: approval.profileKycStatus,
    usersOwnerStatus: approval.usersOwnerStatus,
    usersKycStatus: approval.usersKycStatus,
    legacyOwnerKycStatus: approval.legacyKycStatus,
    legacyOwnersKycVerified: null,
    vehicleApprovalStatus,
    vehicleDocumentsStatus,
    resolvedOwnerStatus: approval.ownerStatus,
    resolvedKycStatus: approval.kycStatus,
    ownerApproved: approval.ownerApproved,
    kycApproved: approval.kycApproved,
    vehicleApproved,
    documentsApproved,
    vehicleCheckSkipped,
  };
}

export async function isOwnerKycVerified(ownerId: string): Promise<boolean> {
  const approval = await fetchOwnerApprovalState(ownerId);
  return approval.ownerApproved && approval.kycApproved;
}

export async function assertOwnerCanReceiveBookings(
  ownerId: string,
  vehicleId?: string
): Promise<string | null> {
  let snapshot = await fetchOwnerBookingGateSnapshot(ownerId, vehicleId);

  console.log("[assertOwnerCanReceiveBookings] snapshot", JSON.stringify(snapshot, null, 2));

  if (!snapshot.ownerApproved || !snapshot.kycApproved) {
    const healed = await healOwnerApprovalDrift(ownerId);
    if (healed) {
      snapshot = await fetchOwnerBookingGateSnapshot(ownerId, vehicleId);
      console.log("[assertOwnerCanReceiveBookings] post-heal snapshot", JSON.stringify(snapshot, null, 2));
    }
  }

  if (!snapshot.ownerApproved) {
    console.warn("[assertOwnerCanReceiveBookings] BLOCKED owner_status", {
      ownerId,
      canonicalOwnerId: snapshot.canonicalOwnerId,
      resolvedOwnerStatus: snapshot.resolvedOwnerStatus,
      ownerProfileOwnerStatus: snapshot.ownerProfileOwnerStatus,
      usersOwnerStatus: snapshot.usersOwnerStatus,
    });
    return `This owner is not approved yet (owner_status=${snapshot.resolvedOwnerStatus}). Contact support if admin already approved this owner.`;
  }

  if (!snapshot.kycApproved) {
    console.warn("[assertOwnerCanReceiveBookings] BLOCKED kyc_status", {
      ownerId,
      canonicalOwnerId: snapshot.canonicalOwnerId,
      resolvedKycStatus: snapshot.resolvedKycStatus,
      ownerProfileKycStatus: snapshot.ownerProfileKycStatus,
      usersKycStatus: snapshot.usersKycStatus,
      legacyOwnerKycStatus: snapshot.legacyOwnerKycStatus,
    });
    return `This owner is not verified yet. Bookings cannot be placed until KYC is approved (kyc_status=${snapshot.resolvedKycStatus}).`;
  }

  if (vehicleId && !snapshot.vehicleApproved) {
    console.warn("[assertOwnerCanReceiveBookings] BLOCKED vehicle_status", {
      ownerId,
      vehicleId,
      vehicleApprovalStatus: snapshot.vehicleApprovalStatus,
    });
    return `This vehicle is not approved for booking (vehicle_status=${snapshot.vehicleApprovalStatus ?? "unknown"}).`;
  }

  console.log("[assertOwnerCanReceiveBookings] ALLOWED", {
    ownerId,
    canonicalOwnerId: snapshot.canonicalOwnerId,
    vehicleId: vehicleId ?? null,
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
