"use client";

import { motion } from "framer-motion";
import { IndianRupee, MapPin, Users, Car } from "lucide-react";

const STATS = [
  {
    value: "10,000+",
    label: "Happy Riders",
    icon: Users,
    accent: "from-primary to-blue-400",
  },
  {
    value: "2,500+",
    label: "Vehicle Owners",
    icon: Car,
    accent: "from-accent to-cyan-300",
  },
  {
    value: "150+",
    label: "Cities Covered",
    icon: MapPin,
    accent: "from-violet-500 to-primary",
  },
  {
    value: "Up To 40%",
    label: "Savings on Return Journeys",
    icon: IndianRupee,
    accent: "from-emerald-500 to-accent",
  },
];

export default function TrustStats() {
  return (
    <section className="relative -mt-10 z-20 pb-4 md:-mt-14">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 gap-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-[0_24px_64px_rgba(10,25,47,0.08)] md:grid-cols-4 md:gap-4 md:p-6 lg:p-8"
        >
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-gray-100/80 bg-gradient-to-br from-white to-gray-50/80 p-4 text-center transition hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 md:p-5"
            >
              <div
                className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${stat.accent} text-white shadow-md shadow-primary/15 md:h-12 md:w-12`}
              >
                <stat.icon className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <p className="text-xl font-bold tracking-tight text-secondary md:text-2xl lg:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-medium text-gray-500 md:text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
