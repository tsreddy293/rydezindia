export function OwnerCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-2xl border bg-white dark:bg-gray-900">
          <div className="h-40 bg-gray-200 dark:bg-gray-800" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-8 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function OwnerTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2 rounded-2xl border bg-white p-4 dark:bg-gray-900">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-gray-100 dark:bg-gray-800" />
      ))}
    </div>
  );
}
