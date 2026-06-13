"use client";

import { motion } from "framer-motion";
import AnimatedCounter from "@/components/ui/AnimatedCounter";

interface StatsBarProps {
  stats: {
    vehicles: number;
    vehicleOwners: number;
    bookings: number;
    returnJourneys: number;
  };
}

export default function StatsBar({ stats }: StatsBarProps) {
  const items = [
    { value: stats.vehicles, label: "Vehicles Listed" },
    { value: stats.vehicleOwners, label: "Verified Owners" },
    { value: stats.bookings, label: "Bookings Completed" },
    { value: stats.returnJourneys, label: "Active Trips" },
  ];

  return (
    <section className="py-12 bg-white border-y border-gray-100">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {items.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl md:text-4xl font-bold text-primary">
                <AnimatedCounter end={stat.value} />
              </p>
              <p className="mt-1 text-sm text-gray-600">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
