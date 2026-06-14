"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { HERO_BADGES } from "@/lib/data";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <Image
        src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&q=80"
        alt="Premium vehicle on Indian highway — Rydez India vehicle sharing"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 hero-gradient" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-32 md:px-6 w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl"
        >
          <span className="inline-block rounded-full bg-accent/20 border border-accent/40 px-4 py-1.5 text-sm font-medium text-accent mb-6">
            India&apos;s Trusted AI-Powered Vehicle Sharing Platform
          </span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
            Turn Your Car Into{" "}
            <span className="gradient-text">Income</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-white/80 max-w-xl">
            Connect with verified users, earn from idle vehicles, and experience
            affordable mobility powered by AI.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Button href="/owner/register" variant="accent" size="lg">
              Register Your Vehicle
            </Button>
            <Button href="/search" variant="outline" size="lg" className="!border-white !text-white hover:!bg-white hover:!text-secondary">
              Book A Vehicle
            </Button>
          </div>

          <div className="mt-12 flex flex-wrap gap-3">
            {HERO_BADGES.map((badge, i) => (
              <motion.span
                key={badge}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 text-sm text-white"
              >
                <CheckCircle className="h-4 w-4 text-accent" />
                {badge}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
