import Link from "next/link";
import { AlertCircle, Clock, ShieldCheck, Upload } from "lucide-react";
import Button from "@/components/ui/Button";
import type { SelfDriveKycGateResult } from "@/lib/kyc/self-drive-gate";
import { selfDriveKycRedirectPath } from "@/lib/kyc/self-drive-gate";

interface Props {
  gate: Extract<SelfDriveKycGateResult, { allowed: false }>;
  returnPath: string;
}

export default function SelfDriveKycGate({ gate, returnPath }: Props) {
  const kycHref = selfDriveKycRedirectPath(returnPath);

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-8 shadow-sm">
      <div className="flex items-start gap-4">
        {gate.status === "pending" ? (
          <Clock className="h-10 w-10 text-amber-500 shrink-0" />
        ) : gate.status === "rejected" ? (
          <AlertCircle className="h-10 w-10 text-red-500 shrink-0" />
        ) : (
          <ShieldCheck className="h-10 w-10 text-primary shrink-0" />
        )}
        <div className="space-y-4 flex-1">
          <div>
            <h2 className="text-xl font-bold text-secondary">
              {gate.status === "pending"
                ? "KYC Under Review"
                : gate.status === "rejected"
                  ? "KYC Rejected"
                  : "KYC Required for Self Drive"}
            </h2>
            <p className="text-sm text-gray-600 mt-2">{gate.message}</p>
            {gate.status === "rejected" && gate.rejectionReason && (
              <p className="text-sm text-red-600 mt-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                Reason: {gate.rejectionReason}
              </p>
            )}
          </div>

          {gate.status === "not_submitted" || gate.status === "rejected" ? (
            <div className="flex flex-wrap gap-3">
              <Button href={kycHref} variant="primary">
                <Upload className="h-4 w-4 mr-2" />
                Upload KYC Documents
              </Button>
              <Button href="/search-self-drive" variant="outline">
                Back to Search
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Button href="/dashboard/kyc" variant="outline">
                View KYC Status
              </Button>
              <Button href="/search-self-drive" variant="outline">
                Back to Search
              </Button>
            </div>
          )}

          <p className="text-xs text-gray-400">
            Owner-driven, driver-included, and outstation trips need mobile OTP only. Self-drive rentals require
            verified identity documents.
          </p>
          {gate.status === "not_submitted" && (
            <p className="text-sm text-gray-500">
              New to Rydez?{" "}
              <Link href={`/login/rider?return=${encodeURIComponent(returnPath)}`} className="text-primary underline">
                Log in
              </Link>{" "}
              to upload documents faster.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
