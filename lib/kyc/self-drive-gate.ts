import { getCustomerKyc } from "@/lib/services/customer-kyc";
import { normalizeCustomerKycStatus } from "@/lib/admin/customer-kyc-fields";

export type SelfDriveKycGateResult =
  | { allowed: true; status: "approved" }
  | {
      allowed: false;
      status: "not_submitted" | "pending" | "rejected";
      message: string;
      rejectionReason?: string;
    };

export async function checkSelfDriveKycGate(userId: string): Promise<SelfDriveKycGateResult> {
  const kyc = await getCustomerKyc(userId);
  const rawStatus = (kyc?.status as string | undefined) ?? "not_submitted";
  const status = normalizeCustomerKycStatus(rawStatus);

  if (status === "approved") {
    return { allowed: true, status: "approved" };
  }

  if (status === "pending") {
    return {
      allowed: false,
      status: "pending",
      message: "Your KYC is under review. Self-drive booking will be available once admin approves your documents.",
    };
  }

  if (status === "rejected") {
    const rejectionReason =
      String((kyc as { remarks?: string } | null)?.remarks ?? "").trim() ||
      "Your documents did not meet verification requirements.";
    return {
      allowed: false,
      status: "rejected",
      message: "Your KYC was rejected. Please re-upload your documents to book a self-drive vehicle.",
      rejectionReason,
    };
  }

  return {
    allowed: false,
    status: "not_submitted",
    message:
      "Self-drive vehicles require identity verification. Please upload Aadhaar and Driving License documents.",
  };
}

export function selfDriveKycRedirectPath(bookingPath?: string): string {
  if (!bookingPath) return "/dashboard/kyc?reason=self_drive";
  return `/dashboard/kyc?reason=self_drive&return=${encodeURIComponent(bookingPath)}`;
}
