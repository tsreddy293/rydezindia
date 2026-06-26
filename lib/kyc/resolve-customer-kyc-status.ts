import {
  customerKycDisplayStatus,
  customerKycHasRequiredDocs,
} from "@/lib/admin/customer-kyc-fields";
import {
  getCustomerKyc,
  hasCustomerKycRecord,
  readCustomerKycDocuments,
} from "@/lib/services/customer-kyc";
import type { CustomerKycStatusResult } from "@/server/actions/customerKyc";

const EMPTY: CustomerKycStatusResult = {
  status: "not_submitted",
  rawStatus: "not_submitted",
  kyc: null,
  documents: {},
  hasRequiredDocs: false,
  canSubmit: true,
};

export async function resolveCustomerKycStatus(userId: string): Promise<CustomerKycStatusResult> {
  try {
    const kyc = await getCustomerKyc(userId);
    const persisted = hasCustomerKycRecord(kyc);
    const documents = readCustomerKycDocuments(persisted ? kyc : null);
    const rawStatus = String(kyc.status ?? "not_submitted");
    const status = customerKycDisplayStatus(rawStatus, documents);
    const hasRequiredDocs = customerKycHasRequiredDocs(documents);

    return {
      status,
      rawStatus,
      kyc: persisted ? kyc : null,
      documents,
      hasRequiredDocs,
      canSubmit: status !== "approved",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load KYC status";
    console.error("[resolveCustomerKycStatus]", error);
    return { ...EMPTY, loadError: message };
  }
}
