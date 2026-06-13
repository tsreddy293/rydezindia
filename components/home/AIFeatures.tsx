"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { AI_FEATURES } from "@/lib/data";

export default function AIFeatures() {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading
          title="AI-Powered Intelligence"
          subtitle="Cutting-edge artificial intelligence driving every decision"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AI_FEATURES.map((feature, i) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 p-4 shadow-sm card-hover"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-secondary">{feature}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
