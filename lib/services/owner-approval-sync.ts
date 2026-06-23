import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumnError } from "@/lib/supabase/errors";
import { ownerStatusFromRow } from "@/lib/admin/owner-profile-status";
import { resolveOwnerKycAdminStatus } from "@/lib/admin/owner-kyc-status";
import { normalizeProfileStatus } from "@/lib/admin/owner-profile-fields";
import { getOwnerProfileKyc } from "@/lib/services/owner-profile-kyc";
import type { OwnerStatus } from "@/lib/admin/owner-status";

export type OwnerApprovalSources = {
  canonicalUserId: string;
  profileFound: boolean;
  profileOwnerStatus: string | null;
  profileKycStatus: string | null;
  usersOwnerStatus: string | null;
  usersKycStatus: string | null;
  legacyKycStatus: string | null;
  vehicleOwnersStatus: string | null;
  ownersVerificationStatus: string | null;
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

function isMissingTableError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("could not find the table") ||
    error.message?.toLowerCase().includes("does not exist")
  );
}

/** Resolve vehicle/listing owner_id to the auth user id used by owner_profiles.user_id. */
export async function resolveCanonicalOwnerUserId(ownerId: string): Promise<string> {
  const id = ownerId.trim();
  if (!id) return id;

  const db = createAdminClient();

  const [profileResult, userResult] = await Promise.all([
    db.from("owner_profiles").select("user_id").eq("user_id", id).maybeSingle(),
    db.from("users").select("id, role").eq("id", id).maybeSingle(),
  ]);

  if (profileResult.data) return id;

  const { data: legacyOwner } = await db
    .from("vehicle_owners")
    .select("owner_id")
    .eq("id", id)
    .maybeSingle();

  const linkedId = asRecord(legacyOwner)?.owner_id;
  if (typeof linkedId === "string" && linkedId.trim()) {
    return linkedId.trim();
  }

  // Auth user without owner_profiles row — still the canonical id for owners.
  const userRole = String(asRecord(userResult.data)?.role ?? "").toLowerCase();
  if (userResult.data && (userRole === "owner" || userRole === "admin")) {
    return id;
  }

  const { data: legacyOwnersRow } = await db
    .from("owners")
    .select("id, mobile, email")
    .eq("id", id)
    .maybeSingle();

  const legacyOwners = asRecord(legacyOwnersRow);
  if (legacyOwners) {
    const email = String(legacyOwners.email ?? "")
      .trim()
      .toLowerCase();
    const mobile = String(legacyOwners.mobile ?? "").replace(/\s/g, "");

    if (email) {
      const { data: userByEmail } = await db.from("users").select("id").eq("email", email).maybeSingle();
      if (userByEmail?.id) return String(userByEmail.id);
    }

    if (mobile) {
      const { data: userByMobile } = await db.from("users").select("id").eq("mobile", mobile).maybeSingle();
      if (userByMobile?.id) return String(userByMobile.id);
    }
  }

  return id;
}

export type BookingOwnerContext = {
  vehicleId: string | undefined;
  rawOwnerId: string;
  canonicalOwnerId: string;
};

/** Booking always trusts vehicles.owner_id, then resolves to auth user id for approval checks. */
export async function resolveBookingOwnerContext(input: {
  vehicleId?: string;
  ownerIdHint?: string;
}): Promise<BookingOwnerContext> {
  const db = createAdminClient();
  const vehicleId = input.vehicleId?.trim() || undefined;
  let rawOwnerId = input.ownerIdHint?.trim() ?? "";

  if (vehicleId) {
    const { data: vehicle } = await db
      .from("vehicles")
      .select("id, owner_id")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicle) {
      const dbOwnerId = String((vehicle as { owner_id?: string }).owner_id ?? "").trim();
      if (dbOwnerId) {
        rawOwnerId = dbOwnerId;
      }
    }
  }

  if (!rawOwnerId) {
    return { vehicleId, rawOwnerId: "", canonicalOwnerId: "" };
  }

  const canonicalOwnerId = await resolveCanonicalOwnerUserId(rawOwnerId);
  return { vehicleId, rawOwnerId, canonicalOwnerId };
}

/** Same read path as owner dashboard — try every plausible owner id for this booking. */
export async function resolveOwnerProfileApprovalForBooking(
  ctx: BookingOwnerContext
): Promise<{
  userId: string;
  ownerStatus: OwnerStatus;
  kycStatus: OwnerStatus;
  ownerApproved: boolean;
  kycApproved: boolean;
} | null> {
  const db = createAdminClient();
  const candidateIds = new Set<string>();

  if (ctx.canonicalOwnerId) candidateIds.add(ctx.canonicalOwnerId);
  if (ctx.rawOwnerId) candidateIds.add(ctx.rawOwnerId);

  if (ctx.vehicleId) {
    const { data: vehicle } = await db
      .from("vehicles")
      .select("owner_id")
      .eq("id", ctx.vehicleId)
      .maybeSingle();
    const vehicleOwnerId = String((vehicle as { owner_id?: string } | null)?.owner_id ?? "").trim();
    if (vehicleOwnerId) {
      candidateIds.add(vehicleOwnerId);
      candidateIds.add(await resolveCanonicalOwnerUserId(vehicleOwnerId));
    }
  }

  for (const userId of candidateIds) {
    const profile = await getOwnerProfileKyc(userId);
    if (!profile) continue;

    const ownerStatus = normalizeProfileStatus(profile.owner_status, "pending");
    const kycStatus = normalizeProfileStatus(profile.kyc_status, "pending");
    const ownerApproved = ownerStatus === "approved";
    const kycApproved = kycStatus === "approved";

    if (ownerApproved && kycApproved) {
      return { userId, ownerStatus, kycStatus, ownerApproved, kycApproved };
    }
  }

  return null;
}

async function syncVehicleOwnerIdsToCanonical(userId: string): Promise<void> {
  const db = createAdminClient();
  const { data: legacyRows, error } = await db
    .from("vehicle_owners")
    .select("id")
    .eq("owner_id", userId);

  if (error && !isMissingTableError(error)) {
    console.warn("[syncVehicleOwnerIdsToCanonical] vehicle_owners lookup:", error.message);
    return;
  }

  const legacyIds = (legacyRows ?? [])
    .map((row) => String((row as { id?: string }).id ?? ""))
    .filter(Boolean);

  for (const legacyId of legacyIds) {
    const { error: updateError } = await db
      .from("vehicles")
      .update({ owner_id: userId, updated_at: new Date().toISOString() })
      .eq("owner_id", legacyId);
    if (updateError && !isMissingTableError(updateError)) {
      console.warn("[syncVehicleOwnerIdsToCanonical] vehicles update:", updateError.message);
    }
  }
}

/** Align all stores to owner_profiles when profile is already approved (admin source of truth). */
export async function ensureOwnerApprovalSyncedForBooking(
  canonicalOwnerId: string,
  vehicleId?: string
): Promise<void> {
  if (!canonicalOwnerId) return;

  const db = createAdminClient();
  const { data: profile } = await db
    .from("owner_profiles")
    .select("owner_status, kyc_status")
    .eq("user_id", canonicalOwnerId)
    .maybeSingle();

  if (!profile) return;

  const profileOwner = normalizeProfileStatus(
    (profile as { owner_status?: string }).owner_status,
    "pending"
  );
  const profileKyc = normalizeProfileStatus(
    (profile as { kyc_status?: string }).kyc_status,
    "pending"
  );

  if (profileOwner === "approved" || profileKyc === "approved") {
    await syncOwnerApprovalToProfile(canonicalOwnerId, {
      ...(profileOwner === "approved" ? { owner_status: "approved" as const } : {}),
      ...(profileKyc === "approved" ? { kyc_status: "approved" as const } : {}),
      ...(profileOwner === "approved" ? { approved_at: new Date().toISOString() } : {}),
    });
  }

  await syncVehicleOwnerIdsToCanonical(canonicalOwnerId);

  if (vehicleId) {
    const { data: vehicle } = await db
      .from("vehicles")
      .select("owner_id")
      .eq("id", vehicleId)
      .maybeSingle();
    const currentOwnerId = String((vehicle as { owner_id?: string } | null)?.owner_id ?? "");
    if (currentOwnerId && currentOwnerId !== canonicalOwnerId) {
      const resolved = await resolveCanonicalOwnerUserId(currentOwnerId);
      if (resolved === canonicalOwnerId) {
        await db
          .from("vehicles")
          .update({ owner_id: canonicalOwnerId, updated_at: new Date().toISOString() })
          .eq("id", vehicleId);
      }
    }
  }
}

async function selectUserApprovalRow(userId: string) {
  const db = createAdminClient();
  let result = await db.from("users").select("id, owner_status, kyc_status").eq("id", userId).maybeSingle();

  if (result.error && isMissingColumnError(result.error, "owner_status", "kyc_status")) {
    result = await db.from("users").select("id, kyc_status").eq("id", userId).maybeSingle();
  }

  return result;
}

async function loadLegacyOwnerStatusRows(ownerId: string, canonicalUserId: string) {
  const db = createAdminClient();

  const [vehicleOwnersByAuth, vehicleOwnersByLegacyId, ownersById, ownersByUser] = await Promise.all([
    db.from("vehicle_owners").select("status").eq("owner_id", canonicalUserId).maybeSingle(),
    db.from("vehicle_owners").select("status").eq("id", ownerId).maybeSingle(),
    db.from("owners").select("verification_status").eq("id", ownerId).maybeSingle(),
    canonicalUserId !== ownerId
      ? db.from("owners").select("verification_status").eq("id", canonicalUserId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const vehicleOwnersStatus =
    asRecord(vehicleOwnersByAuth.data)?.status ??
    asRecord(vehicleOwnersByLegacyId.data)?.status ??
    null;

  const ownersVerificationStatus =
    asRecord(ownersById.data)?.verification_status ??
    asRecord(ownersByUser.data)?.verification_status ??
    null;

  return {
    vehicleOwnersStatus: vehicleOwnersStatus ? String(vehicleOwnersStatus) : null,
    ownersVerificationStatus: ownersVerificationStatus ? String(ownersVerificationStatus) : null,
  };
}

/** Single source of truth — same merge rules as Admin Owner Management and booking gates. */
export async function fetchOwnerApprovalState(ownerId: string): Promise<OwnerApprovalState> {
  const canonicalUserId = await resolveCanonicalOwnerUserId(ownerId);
  const db = createAdminClient();

  const [profileResult, userResult, legacyKycResult, legacyStatus] = await Promise.all([
    db
      .from("owner_profiles")
      .select("user_id, owner_status, kyc_status, status")
      .eq("user_id", canonicalUserId)
      .maybeSingle(),
    selectUserApprovalRow(canonicalUserId),
    db.from("owner_kyc").select("status").eq("owner_id", canonicalUserId).maybeSingle(),
    loadLegacyOwnerStatusRows(ownerId, canonicalUserId),
  ]);

  const profile = asRecord(profileResult.data);
  const user = asRecord(userResult.data);
  const legacyKyc = asRecord(legacyKycResult.data);

  const ownerStatus = ownerStatusFromRow(profile, user, legacyStatus);
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
    vehicleOwnersStatus: legacyStatus.vehicleOwnersStatus,
    ownersVerificationStatus: legacyStatus.ownersVerificationStatus,
    ownerStatus,
    kycStatus,
    ownerApproved: ownerStatus === "approved",
    kycApproved,
  };
}

async function syncLegacyOwnerTables(
  userId: string,
  patch: {
    owner_status?: OwnerStatus;
    kyc_status?: OwnerStatus | "verified";
  }
): Promise<void> {
  const db = createAdminClient();
  const now = new Date().toISOString();

  if (patch.owner_status) {
    for (const column of ["owner_id", "id"] as const) {
      const { error } = await db
        .from("vehicle_owners")
        .update({ status: patch.owner_status, updated_at: now })
        .eq(column, userId);
      if (error && !isMissingTableError(error)) {
        console.warn(`[syncLegacyOwnerTables] vehicle_owners.${column}:`, error.message);
      }
    }

    const verificationStatus =
      patch.owner_status === "approved"
        ? "approved"
        : patch.owner_status === "rejected"
          ? "rejected"
          : "pending";

    for (const column of ["id"] as const) {
      const { error } = await db
        .from("owners")
        .update({ verification_status: verificationStatus })
        .eq(column, userId);
      if (error && !isMissingTableError(error)) {
        console.warn(`[syncLegacyOwnerTables] owners.${column}:`, error.message);
      }
    }

    const { data: userRow } = await db.from("users").select("mobile, email").eq("id", userId).maybeSingle();
    const mobile = String((userRow as { mobile?: string } | null)?.mobile ?? "").replace(/\s/g, "");
    if (mobile) {
      const { error } = await db
        .from("owners")
        .update({ verification_status: verificationStatus })
        .eq("mobile", mobile);
      if (error && !isMissingTableError(error)) {
        console.warn("[syncLegacyOwnerTables] owners.mobile:", error.message);
      }
    }
  }

  if (patch.kyc_status) {
    const kycStatus = patch.kyc_status === "verified" ? "approved" : patch.kyc_status;
    const { data: existing } = await db.from("owner_kyc").select("id").eq("owner_id", userId).maybeSingle();
    if (existing) {
      const { error } = await db
        .from("owner_kyc")
        .update({ status: kycStatus, updated_at: now })
        .eq("owner_id", userId);
      if (error && !isMissingTableError(error)) {
        console.warn("[syncLegacyOwnerTables] owner_kyc:", error.message);
      }
    }
  }
}

/**
 * Write owner approval to owner_profiles + users + legacy tables.
 * owner_profiles is the admin UI source of truth; all stores are kept in sync.
 */
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
    profilePatch.kyc_status = patch.kyc_status === "verified" ? "approved" : patch.kyc_status;
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

  await syncLegacyOwnerTables(userId, patch);
  await syncVehicleOwnerIdsToCanonical(userId);

  return { ok: true };
}

/**
 * If any store shows approved but others still show pending, sync all to approved
 * so booking gates match Admin Owner Management.
 */
export async function healOwnerApprovalDrift(ownerId: string): Promise<boolean> {
  const state = await fetchOwnerApprovalState(ownerId);
  const profileOwner = normalizeProfileStatus(state.profileOwnerStatus, "pending");
  const profileKyc = normalizeProfileStatus(state.profileKycStatus, "pending");
  const usersOwner = normalizeProfileStatus(state.usersOwnerStatus, "pending");
  const usersKyc = normalizeProfileStatus(state.usersKycStatus, "pending");

  const needsOwnerHeal =
    state.ownerApproved &&
    (profileOwner !== "approved" || usersOwner !== "approved");

  const needsKycHeal =
    state.kycApproved && (profileKyc !== "approved" || usersKyc !== "approved");

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

  console.log("[healOwnerApprovalDrift] healed owner approval drift", {
    ownerId,
    canonicalUserId: state.canonicalUserId,
    needsOwnerHeal,
    needsKycHeal,
  });

  return true;
}
