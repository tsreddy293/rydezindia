import Button from "@/components/ui/Button";
import { Clock } from "lucide-react";
import type { SelfDriveKycGateResult } from "@/lib/kyc/self-drive-gate";
import { selfDriveKycPath } from "@/lib/kyc/self-drive-nav";

interface Props {
  gate: Extract<SelfDriveKycGateResult, { allowed: false }>;
  returnPath: string;
}

export default function SelfDriveKycGate({ gate, returnPath }: Props) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <Clock className="h-10 w-10 text-amber-500 shrink-0" />
        <div className="space-y-4 flex-1">
          <div>
            <h2 className="text-xl font-bold text-secondary">KYC Under Review</h2>
            <p className="text-sm text-gray-600 mt-2">{gate.message}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button href={selfDriveKycPath(returnPath)} variant="outline">
              View KYC Status
            </Button>
            <Button href="/dashboard" variant="outline">
              Go to Dashboard
            </Button>
            <Button href="/search-self-drive" variant="outline">
              Back to Search
            </Button>
          </div>

          <p className="text-xs text-gray-400">
            You will be able to complete payment once admin approves your documents.
          </p>
        </div>
      </div>
    </div>
  );
}
