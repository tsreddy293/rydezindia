import {
  OWNER_STATUSES,
  ownerStatusBadgeClasses,
  ownerStatusButtonClasses,
  type OwnerStatus,
} from "@/lib/admin/owner-status";
import { updateOwnerKycByUserId } from "@/server/actions/phase2Admin";

export function AdminOwnerKycStatusBadge({ status }: { status: OwnerStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ownerStatusBadgeClasses(status)}`}
    >
      {status}
    </span>
  );
}

export function AdminOwnerKycActions({
  ownerId,
  currentStatus,
  canApprove,
}: {
  ownerId: string;
  currentStatus: OwnerStatus;
  canApprove: boolean;
}) {
  const showDocumentsRequired = !canApprove && currentStatus !== "approved";

  return (
    <div className="space-y-2 min-w-[200px]">
      {showDocumentsRequired && (
        <p className="text-xs font-medium text-amber-600">Documents Required</p>
      )}
      <div className="flex flex-wrap gap-2">
        {OWNER_STATUSES.map((status) => {
          const isActive = currentStatus === status;
          const isApprove = status === "approved";
          const disabled = isActive || (isApprove && !canApprove);

          return (
            <form
              key={status}
              action={async () => {
                "use server";
                if (!disabled) {
                  await updateOwnerKycByUserId(ownerId, status);
                }
              }}
            >
              <button
                type="submit"
                disabled={disabled}
                aria-pressed={isActive}
                title={
                  isApprove && !canApprove && !isActive
                    ? "Upload Aadhaar and Driving License before approving"
                    : undefined
                }
                className={`${ownerStatusButtonClasses(status, isActive)} ${
                  isApprove && !canApprove && !isActive ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {status}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
