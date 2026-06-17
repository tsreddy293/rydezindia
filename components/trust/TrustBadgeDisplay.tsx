import { BadgeCheck, Shield, Star } from "lucide-react";
import type { TrustBadges } from "@/lib/services/trust-badges";

interface Props {
  badges: Partial<TrustBadges>;
  size?: "sm" | "md";
}

export default function TrustBadgeDisplay({ badges, size = "sm" }: Props) {
  const textClass = size === "sm" ? "text-xs" : "text-sm";
  const items = [
    badges.verifiedUser && { label: "Verified User", icon: BadgeCheck, color: "text-green-600 bg-green-50" },
    badges.verifiedOwner && { label: "Verified Owner", icon: Shield, color: "text-blue-600 bg-blue-50" },
    badges.verifiedVehicle && { label: "Verified Vehicle", icon: BadgeCheck, color: "text-green-600 bg-green-50" },
    badges.topRatedDriver && { label: "Top Rated Driver", icon: Star, color: "text-yellow-600 bg-yellow-50" },
    badges.topRatedVehicle && { label: "Top Rated Vehicle", icon: Star, color: "text-yellow-600 bg-yellow-50" },
  ].filter(Boolean) as { label: string; icon: typeof BadgeCheck; color: string }[];

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(({ label, icon: Icon, color }) => (
        <span key={label} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${textClass} ${color}`}>
          <Icon className="h-3 w-3" />
          {label}
        </span>
      ))}
    </div>
  );
}
