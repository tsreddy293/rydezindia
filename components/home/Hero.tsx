"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles, Star } from "lucide-react";
import Button from "@/components/ui/Button";
import GoogleMapsProvider from "@/components/maps/GoogleMapsProvider";
import HeroSearchForm from "@/components/home/HeroSearchForm";

const TRUST_PILLS = ["Verified Owners", "Secure Payments", "AI Matching", "24×7 Support"];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-secondary">
      <div className="absolute inset-0 bg-gradient-to-br from-secondary via-[#0c1a33] to-[#071428]" />
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-primary/25 blur-[100px]" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-accent/20 blur-[90px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-[80px]" />

      <div className="absolute inset-0 opacity-[0.12]">
        <Image
          src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&q=60"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          aria-hidden
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/95 via-secondary/88 to-secondary/95" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-8 md:px-6 md:pb-20 md:pt-12 lg:pt-14">
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 xl:gap-16">
          <motion.div {...fadeUp} transition={{ duration: 0.55 }} className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm md:text-xs">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              India&apos;s Smart Vehicle Marketplace
            </span>

            <h1 className="mt-5 text-[2rem] font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-[3.25rem] lg:text-[3.5rem] xl:text-6xl">
              Travel Smarter.
              <span className="mt-1 block bg-gradient-to-r from-primary via-blue-400 to-accent bg-clip-text text-transparent sm:mt-2">
                Earn Better.
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80 md:mt-5 md:text-lg">
              Book verified rides, return journeys, self-drive cars, and chauffeur trips — or list
              your vehicle and start earning on a platform built for trust.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {TRUST_PILLS.map((pill) => (
                <span
                  key={pill}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/85 md:text-xs"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                  {pill}
                </span>
              ))}
            </div>

            <GoogleMapsProvider>
              <HeroSearchForm />
            </GoogleMapsProvider>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="relative hidden lg:block"
          >
            <div className="relative ml-auto w-full max-w-lg xl:max-w-xl">
              <div className="overflow-hidden rounded-[1.75rem] border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
                <Image
                  src="/images/image 3.png"
                  alt="Happy travelers using Rydez India"
                  width={900}
                  height={620}
                  priority
                  unoptimized
                  className="aspect-[4/3] w-full object-cover object-center"
                />
              </div>

              <div className="absolute -bottom-5 -left-5 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 shadow-xl backdrop-blur-xl">
                <div className="flex items-center gap-1 text-accent">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="mt-1 text-sm font-semibold text-white">4.9/5 rider satisfaction</p>
                <p className="text-xs text-white/60">From 10,000+ trips</p>
              </div>

              <div className="absolute -right-4 top-8 rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/20 to-primary/20 px-4 py-3 backdrop-blur-xl">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">Return Journeys</p>
                <p className="mt-0.5 text-lg font-bold text-white">Save up to 40%</p>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button
                href="/signup/owner"
                variant="outline"
                size="lg"
                className="!border-white/40 !text-white hover:!bg-white hover:!text-secondary"
              >
                List Your Vehicle
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
