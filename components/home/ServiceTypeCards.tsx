"use client";

import { motion } from "framer-motion";

export type ServiceTypeKey = "self_drive" | "with_driver" | "return_journey" | "local_rental";

export type ServiceCardConfig = {
  key: ServiceTypeKey;
  icon: string;
  title: string;
  subtitle: string;
  badge?: string;
  accentGradient: string;
};

export const SERVICE_CARDS: ServiceCardConfig[] = [
  {
    key: "self_drive",
    icon: "🚘",
    title: "Self Drive",
    subtitle: "Drive Yourself",
    accentGradient: "from-primary/25 via-blue-500/15 to-accent/10",
  },
  {
    key: "with_driver",
    icon: "👨‍✈️",
    title: "Vehicle + Driver",
    subtitle: "Relax & Travel",
    accentGradient: "from-indigo-500/20 via-primary/15 to-blue-400/10",
  },
  {
    key: "return_journey",
    icon: "🔄",
    title: "Return Journey",
    subtitle: "Save Up To 40%",
    badge: "MOST POPULAR",
    accentGradient: "from-accent/25 via-primary/20 to-blue-500/15",
  },
  {
    key: "local_rental",
    icon: "📍",
    title: "Local Rental",
    subtitle: "Hourly & Daily",
    accentGradient: "from-cyan-500/20 via-primary/12 to-blue-600/10",
  },
];

interface ServiceTypeCardsProps {
  value: ServiceTypeKey;
  onChange: (key: ServiceTypeKey) => void;
}

export default function ServiceTypeCards({ value, onChange }: ServiceTypeCardsProps) {
  return (
    <div
      role="tablist"
      aria-label="Choose service type"
      className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-4 lg:gap-3"
    >
      {SERVICE_CARDS.map((card, index) => {
        const selected = value === card.key;

        return (
          <motion.button
            key={card.key}
            type="button"
            role="tab"
            aria-selected={selected}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.05 }}
            whileHover={{ y: selected ? 0 : -3, scale: selected ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(card.key)}
            className={`service-type-card group relative flex min-h-[88px] flex-col items-start rounded-xl border p-2.5 text-left transition-all duration-300 sm:min-h-[96px] sm:p-3 md:min-h-[104px] md:p-3.5 ${
              selected
                ? `service-type-card--selected border-primary/70 bg-gradient-to-br ring-2 ring-primary/40 ${card.accentGradient}`
                : "border-white/15 bg-white/[0.06] hover:border-white/30 hover:bg-white/[0.1] hover:shadow-[0_12px_32px_rgba(0,123,255,0.12)]"
            }`}
          >
            {card.badge ? (
              <span className="absolute -right-1 -top-1.5 z-10 rounded-full bg-gradient-to-r from-accent to-primary px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-white shadow-lg shadow-primary/40 sm:-top-2 sm:px-2 sm:text-[8px]">
                {card.badge}
              </span>
            ) : null}

            <div
              className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-lg backdrop-blur-sm transition-all duration-300 sm:h-9 sm:w-9 sm:text-xl md:mb-2 md:h-10 md:w-10 ${
                selected
                  ? "bg-primary/25 shadow-inner ring-1 ring-primary/30"
                  : "bg-white/10 ring-1 ring-white/10 group-hover:bg-white/15 group-hover:ring-white/20"
              }`}
            >
              <span className="leading-none" aria-hidden>
                {card.icon}
              </span>
            </div>

            <span
              className={`text-[11px] font-bold leading-tight sm:text-xs md:text-[13px] ${
                selected ? "text-white" : "text-white/90 group-hover:text-white"
              }`}
            >
              {card.title}
            </span>
            <span
              className={`mt-0.5 text-[9px] font-medium leading-snug sm:text-[10px] md:text-[11px] ${
                selected ? "text-accent/90" : "text-white/55 group-hover:text-white/70"
              }`}
            >
              {card.subtitle}
            </span>

            {selected ? (
              <motion.span
                layoutId="service-card-glow"
                className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 via-transparent to-accent/5"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            ) : null}
          </motion.button>
        );
      })}
    </div>
  );
}
