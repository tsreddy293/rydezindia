import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumnError } from "@/lib/supabase/errors";
import { ownerStatusFromRow } from "@/lib/admin/owner-profile-status";
import { resolveOwnerKycAdminStatus } from "@/lib/admin/owner-kyc-status";
import { normalizeProfileStatus } from "@/lib/admin/owner-profile-fields";
import type { OwnerStatus } from "@/lib/admin/owner-status";

export type OwnerApprovalSources = {
  canonicalUserId: string;
  profileFound: boolean;
  profileOwnerStatus: string | null;
  profileKycStatus: string | null;
  usersOwnerStatus: string | null;
  usersKycStatus: string | null;
  legacyKycStatus: string | null;
};

export type OwnerApprovalState = OwnerApprovalSources & {
  ownerStatus: OwnerStatus;
  kycStatus: OwnerStatus;
  ownerApproved: boolean;
  kycApproved: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/** Resolve vehicle/listing owner_id to the auth user id used by owner_profiles.user_id. */
export async function resolveCanonicalOwnerUserId(ownerId: string): Promise<string> {
  const id = ownerId.trim();
  if (!id) return id;

  const db = createAdminClient();

  const [profileResult, userResult] = await Promise.all([
    db.from("owner_profiles").select("user_id").eq("user_id", id).maybeSingle(),
    db.from("users").select("id").eq("id", id).maybeSingle(),
  ]);

  if (profileResult.data || userResult.data) return id;

  const { data: legacyOwner } = await db
    .from("vehicle_owners")
    .select("owner_id")
    .eq("id", id)
    .maybeSingle();

  const linkedId = asRecord(legacyOwner)?.owner_id;
  if (typeof linkedId === "string" && linkedId.trim()) {
    return linkedId.trim();
  }

  return id;
}

async function selectUserApprovalRow(userId: string) {
  const db = createAdminClient();
  let result = await db.from("users").select("id, owner_status, kyc_status").eq("id", userId).maybeSingle();

  if (result.error && isMissingColumnError(result.error, "owner_status", "kyc_status")) {
    result = await db.from("users").select("id, kyc_status").eq("id", userId).maybeSingle();
  }

  return result;
}

/** Single source of truth — same merge rules as Admin Owner Management should use. */
export async function fetchOwnerApprovalState(ownerId: string): Promise<OwnerApprovalState> {
  const canonicalUserId = await resolveCanonicalOwnerUserId(ownerId);
  const db = createAdminClient();

  const [profileResult, userResult, legacyKycResult] = await Promise.all([
    db
      .from("owner_profiles")
      .select("user_id, owner_status, kyc_status, status")
      .eq("user_id", canonicalUserId)
      .maybeSingle(),
    selectUserApprovalRow(canonicalUserId),
    db.from("owner_kyc").select("status").eq("owner_id", canonicalUserId).maybeSingle(),
  ]);

  const profile = asRecord(profileResult.data);
  const user = asRecord(userResult.data);
  const legacyKyc = asRecord(legacyKycResult.data);

  const ownerStatus = ownerStatusFromRow(profile, user);
  const kycStatus = resolveOwnerKycAdminStatus({
    profileKyc: profile?.kyc_status as string | undefined,
    userKyc: user?.kyc_status as string | undefined,
    legacyKyc: legacyKyc?.status as string | undefined,
  });

  const legacyVerified = legacyKyc?.status === "approved" || legacyKyc?.status === "verified";
  const kycApproved =
    kycStatus === "approved" || (Boolean(legacyVerified) && kycStatus !== "rejected");

  return {
    canonicalUserId,
    profileFound: Boolean(profile),
    profileOwnerStatus: profile ? String(profile.owner_status ?? "null") : null,
    profileKycStatus: profile ? String(profile.kyc_status ?? "null") : null,
    usersOwnerStatus: user?.owner_status ? String(user.owner_status) : null,
    usersKycStatus: user?.kyc_status ? String(user.kyc_status) : null,
    legacyKycStatus: legacyKyc?.status ? String(legacyKyc.status) : null,
    ownerStatus,
    kycStatus,
    ownerApproved: ownerStatus === "approved",
    kycApproved,
  };
}

/** Keep owner_profiles (source of truth for admin UI) aligned with users / legacy approvals. */
export async function syncOwnerApprovalToProfile(
  userId: string,
  patch: {
    owner_status?: OwnerStatus;
    kyc_status?: OwnerStatus | "verified";
    approved_at?: string | null;
    approved_by?: string | null;
  }
): Promise<{ ok: boolean; error?: string }> {
  const db = createAdminClient();
  const now = new Date().toISOString();

  const profilePatch: Record<string, unknown> = {
    user_id: userId,
    updated_at: now,
  };

  if (patch.owner_status) profilePatch.owner_status = patch.owner_status;
  if (patch.kyc_status) {
    profilePatch.kyc_status =
      patch.kyc_status === "verified" ? "approved" : patch.kyc_status;
  }
  if (patch.approved_at !== undefined) profilePatch.approved_at = patch.approved_at;
  if (patch.approved_by !== undefined) profilePatch.approved_by = patch.approved_by;

  const { error: profileError } = await db
    .from("owner_profiles")
    .upsert(profilePatch, { onConflict: "user_id" });

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  const usersPatch: Record<string, unknown> = {};
  if (patch.owner_status) usersPatch.owner_status = patch.owner_status;
  if (patch.kyc_status) {
    usersPatch.kyc_status = patch.kyc_status === "approved" ? "verified" : patch.kyc_status;
  }

  if (Object.keys(usersPatch).length > 0) {
    const { error: usersError } = await db.from("users").update(usersPatch).eq("id", userId);
    if (
      usersError &&
      !usersError.message.includes("column") &&
      !usersError.message.includes("does not exist")
    ) {
      console.warn("[syncOwnerApprovalToProfile] users sync:", usersError.message);
    }
  }

  return { ok: true };
}

/**
 * If admin approved via users/legacy but owner_profiles still shows pending, heal drift
 * so booking gates match the Admin Dashboard.
 */
export async function healOwnerApprovalDrift(ownerId: string): Promise<boolean> {
  const state = await fetchOwnerApprovalState(ownerId);
  const profileOwner = normalizeProfileStatus(state.profileOwnerStatus, "pending");
  const profileKyc = normalizeProfileStatus(state.profileKycStatus, "pending");

  const needsOwnerHeal = state.ownerApproved && profileOwner !== "approved";
  const needsKycHeal = state.kycApproved && profileKyc !== "approved";

  if (!needsOwnerHeal && !needsKycHeal) {
    return false;
  }

  const sync = await syncOwnerApprovalToProfile(state.canonicalUserId, {
    ...(needsOwnerHeal ? { owner_status: "approved" as const } : {}),
    ...(needsKycHeal ? { kyc_status: "approved" as const } : {}),
    ...(needsOwnerHeal ? { approved_at: new Date().toISOString() } : {}),
  });

  if (!sync.ok) {
    console.warn("[healOwnerApprovalDrift] sync failed", sync.error);
    return false;
  }

  console.log("[healOwnerApprovalDrift] healed owner_profiles drift", {
    ownerId,
    canonicalUserId: state.canonicalUserId,
    needsOwnerHeal,
    needsKycHeal,
  });

  return true;
}
