import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import KycStatusBadge from "@/components/trust/KycStatusBadge";

const KYC_COPY: Record<string, string> = {
  not_submitted: "Upload documents to unlock self-drive bookings.",
  pending: "Documents submitted — awaiting admin review.",
  approved: "You're verified for self-drive rentals.",
  rejected: "KYC rejected. Please re-upload your documents.",
};

export default function KycStatusCard({
  status,
  showKycSection,
}: {
  status: string;
  showKycSection: boolean;
}) {
  if (!showKycSection) return null;

  const badgeStatus = status === "approved" ? "verified" : status;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-secondary">KYC Status</h2>
          <div className="mt-2">
            <KycStatusBadge status={badgeStatus} />
          </div>
          <p className="mt-2 text-sm text-gray-600">{KYC_COPY[status] ?? KYC_COPY.not_submitted}</p>
          {status !== "approved" && (
            <Link
              href="/dashboard/kyc"
              className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              {status === "not_submitted" ? "Upload Documents" : "Manage KYC"}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
