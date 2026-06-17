"use client";

import { motion } from "framer-motion";
import { Brain, RefreshCw, ShieldCheck, TrendingUp } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";

const FEATURES = [
  {
    title: "Return Journey Marketplace",
    description:
      "Book discounted one-way trips when vehicles are returning empty — save up to 40% on popular routes.",
    icon: RefreshCw,
    gradient: "from-primary to-blue-500",
  },
  {
    title: "AI Smart Matching",
    description:
      "Our AI pairs riders with the best vehicle, route, and price — faster bookings, better experiences.",
    icon: Brain,
    gradient: "from-violet-500 to-primary",
  },
  {
    title: "Verified Vehicle Owners",
    description:
      "Every owner completes KYC and document checks so you book with confidence on a trusted network.",
    icon: ShieldCheck,
    gradient: "from-emerald-500 to-teal-400",
  },
  {
    title: "Better Earnings For Owners",
    description:
      "List once, get matched to high-intent riders, and earn ₹20,000–₹50,000 per month from your vehicle.",
    icon: TrendingUp,
    gradient: "from-accent to-cyan-400",
  },
];

export default function WhyRydez() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading
          title="Why Rydez?"
          subtitle="India's premium vehicle marketplace — built for riders who want value and owners who want income."
        />

        <div className="grid gap-5 md:grid-cols-2 md:gap-6 lg:gap-8">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/15 hover:shadow-[0_24px_48px_rgba(0,123,255,0.1)] md:p-8"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary/5 to-accent/5 blur-2xl transition group-hover:from-primary/10 group-hover:to-accent/10" />
              <div
                className={`relative mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg shadow-primary/20`}
              >
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className="relative text-xl font-bold text-secondary md:text-2xl">{feature.title}</h3>
              <p className="relative mt-3 text-sm leading-relaxed text-gray-600 md:text-base">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
