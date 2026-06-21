import { checkSelfDriveKycGate } from "@/lib/kyc/self-drive-gate";
import {
  isSelfDriveBookingPath,
  safeRiderRedirectPath,
  selfDriveKycPath,
} from "@/lib/kyc/self-drive-nav";

/** After login/signup — route self-drive bookings by KYC status. */
export async function resolveSelfDrivePostAuthRedirect(
  returnPath: string,
  userId: string
): Promise<string> {
  const safe = safeRiderRedirectPath(returnPath);
  if (!safe || !isSelfDriveBookingPath(safe)) return safe ?? "/dashboard";

  const gate = await checkSelfDriveKycGate(userId);
  if (gate.allowed) return safe;
  return selfDriveKycPath(safe);
}
