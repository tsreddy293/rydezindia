import Link from "next/link";
import { cn } from "@/lib/utils";

export default function OwnerEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-gray-50/80 to-white px-6 py-14 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary/10 to-primary/10">
        <Icon className="h-8 w-8 text-primary/60" />
      </div>
      <h3 className="text-base font-semibold text-secondary">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-gray-500">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center rounded-xl bg-gradient-to-r from-secondary to-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
