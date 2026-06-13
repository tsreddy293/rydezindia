export default function SupabaseErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-center">
      <p className="font-semibold text-red-700 mb-1">Unable to connect to Supabase</p>
      <p className="text-sm text-red-600">{message}</p>
      <p className="text-xs text-red-500 mt-3">
        Check <code className="bg-red-100 px-1 rounded">.env.local</code> has valid keys, then restart{" "}
        <code className="bg-red-100 px-1 rounded">npm run dev</code>.
      </p>
    </div>
  );
}
