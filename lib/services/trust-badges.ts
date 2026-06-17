import { createAdminClient } from "@/lib/supabase/admin";
import { isCustomerKycVerified } from "@/lib/services/customer-kyc";
import { isOwnerKycVerified } from "@/lib/services/verification";
import { getReviewSummary } from "@/lib/services/reviews";

export interface TrustBadges {
  verifiedUser: boolean;
  verifiedOwner: boolean;
  verifiedVehicle: boolean;
  topRatedDriver: boolean;
  topRatedVehicle: boolean;
}

export async function getUserTrustBadges(userId: string): Promise<Partial<TrustBadges>> {
  const verifiedUser = await isCustomerKycVerified(userId);
  return { verifiedUser };
}

export async function getOwnerTrustBadges(ownerId: string): Promise<Partial<TrustBadges>> {
  const verifiedOwner = await isOwnerKycVerified(ownerId);
  return { verifiedOwner };
}

export async function getVehicleTrustBadges(vehicleId: string): Promise<Partial<TrustBadges>> {
  const db = createAdminClient();
  const { data: vehicle } = await db
    .from("vehicles")
    .select("vehicle_approval_status, rating")
    .eq("id", vehicleId)
    .maybeSingle();

  const v = vehicle as { vehicle_approval_status?: string; rating?: number } | null;
  const summary = await getReviewSummary("vehicle", vehicleId);

  return {
    verifiedVehicle: v?.vehicle_approval_status === "approved",
    topRatedVehicle: (summary?.overall ?? v?.rating ?? 0) >= 4.5,
  };
}

export async function getDriverTrustBadges(driverId: string): Promise<Partial<TrustBadges>> {
  const summary = await getReviewSummary("owner", driverId);
  return {
    topRatedDriver: (summary?.driver ?? summary?.overall ?? 0) >= 4.5,
  };
}
