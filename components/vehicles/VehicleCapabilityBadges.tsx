import { VEHICLE_SERVICES, type VehicleServiceAvailability } from "@/lib/vehicles/services";

interface Props {
  services: Partial<VehicleServiceAvailability>;
  size?: "sm" | "md";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-[10px] tracking-wide",
  md: "px-2.5 py-1 text-[11px] tracking-wide",
};

export default function VehicleCapabilityBadges({
  services,
  size = "sm",
  className = "",
}: Props) {
  const active = VEHICLE_SERVICES.filter(
    (service) => services[service.key] ?? service.defaultEnabled
  );

  if (active.length === 0) {
    return <span className="text-xs text-gray-400">No services</span>;
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {active.map((service) => (
        <span
          key={service.key}
          className={`inline-flex items-center rounded-md font-bold uppercase shadow-sm ring-1 ring-inset ${service.badgeClass} ${SIZE_CLASSES[size]}`}
        >
          {service.badgeLabel}
        </span>
      ))}
    </div>
  );
}
