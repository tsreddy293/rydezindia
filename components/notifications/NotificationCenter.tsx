export default function NotificationCenter({
  notifications,
}: {
  notifications: Record<string, unknown>[];
}) {
  return (
    <section className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-semibold text-secondary">Notifications</h2>
      {notifications.length === 0 ? (
        <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">No notifications yet.</p>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div key={String(notification.id)} className="rounded-xl bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-secondary">{String(notification.title ?? "Notification")}</p>
                <span className="text-xs text-gray-400">
                  {notification.read_at ? "Read" : "Unread"}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{String(notification.message ?? "")}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
