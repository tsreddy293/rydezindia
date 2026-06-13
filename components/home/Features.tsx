"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck, UserCheck, MapPin, CreditCard, Brain,
  Umbrella, Headphones, Lock,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { FEATURES } from "@/lib/data";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldCheck, UserCheck, MapPin, CreditCard, Brain, Umbrella, Headphones, Lock,
};

export default function Features() {
  return (
    <section id="features" className="py-20 bg-secondary">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading
          title="Why Choose Rydez"
          subtitle="Built for trust, powered by AI, designed for India"
          light
        />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => {
            const Icon = ICON_MAP[feature.icon] || ShieldCheck;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl bg-white/5 border border-white/10 p-6 card-hover"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 mb-4">
                  <Icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/60">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
