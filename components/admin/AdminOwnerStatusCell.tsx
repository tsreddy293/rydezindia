import {
  OWNER_STATUSES,
  ownerStatusBadgeClasses,
  ownerStatusButtonClasses,
  type OwnerStatus,
} from "@/lib/admin/owner-status";
import { updateOwnerStatus } from "@/server/actions/marketplaceAdmin";

export function AdminOwnerStatusBadge({ status }: { status: OwnerStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ownerStatusBadgeClasses(status)}`}
    >
      {status}
    </span>
  );
}

export function AdminOwnerStatusActions({
  ownerId,
  currentStatus,
}: {
  ownerId: string;
  currentStatus: OwnerStatus;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {OWNER_STATUSES.map((status) => {
        const isActive = currentStatus === status;
        return (
          <form
            key={status}
            action={async () => {
              "use server";
              if (!isActive) {
                await updateOwnerStatus(ownerId, status);
              }
            }}
          >
            <button
              type="submit"
              disabled={isActive}
              aria-pressed={isActive}
              className={ownerStatusButtonClasses(status, isActive)}
            >
              {status}
            </button>
          </form>
        );
      })}
    </div>
  );
}
