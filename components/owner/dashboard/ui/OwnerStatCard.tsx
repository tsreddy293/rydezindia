import { cn } from "@/lib/utils";

export default function OwnerStatCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
  className,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "emerald" | "blue" | "orange" | "red" | "gray";
  className?: string;
}) {
  const accents = {
    primary: "from-secondary/10 to-primary/10 text-primary",
    emerald: "from-emerald-50 to-emerald-100/50 text-emerald-600",
    blue: "from-blue-50 to-blue-100/50 text-blue-600",
    orange: "from-orange-50 to-orange-100/50 text-orange-600",
    red: "from-red-50 to-red-100/50 text-red-600",
    gray: "from-gray-50 to-gray-100/50 text-gray-600",
  };

  return (
    <div
      className={cn(
        "group rounded-2xl border border-gray-100/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      <div className={cn("mb-3 inline-flex rounded-xl bg-gradient-to-br p-2.5", accents[accent])}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold tracking-tight text-secondary">{value}</p>
      <p className="mt-1 text-xs font-medium text-gray-500">{label}</p>
    </div>
  );
}
