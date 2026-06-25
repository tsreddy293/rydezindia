export default function DashboardChart({
  data,
  valueFormatter,
}: {
  data: { label: string; value: number }[];
  valueFormatter?: (v: number) => string;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const format = valueFormatter ?? ((v: number) => v.toLocaleString("en-IN"));

  if (data.length === 0) {
    return <p className="text-sm text-gray-500">No chart data yet.</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span className="truncate pr-2">{item.label}</span>
            <span className="shrink-0 font-medium">{format(item.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${Math.max((item.value / max) * 100, 4)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
