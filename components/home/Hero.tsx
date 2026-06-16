"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { CheckCircle, Smartphone } from "lucide-react";
import Button from "@/components/ui/Button";
import GoogleMapsProvider from "@/components/maps/GoogleMapsProvider";
import HeroSearchForm from "@/components/home/HeroSearchForm";
import { HERO_BADGES } from "@/lib/data";

type Audience = "rider" | "owner";

const RIDER_FEATURES = [
  "Book Affordable Rides",
  "Return Journey Marketplace",
  "Self Drive Vehicles",
  "Vehicle With Driver",
  "Local Rental Packages",
];

const OWNER_FEATURES = [
  "Register Vehicle",
  "Receive Bookings",
  "Earn Income",
];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function Hero() {
  const [audience, setAudience] = useState<Audience>("rider");

  return (
    <section className="relative overflow-hidden bg-secondary">
      <div className="absolute inset-0 bg-gradient-to-br from-secondary via-[#0d1f3c] to-[#0a2540]" />
      <div className="absolute inset-0 opacity-20">
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
      <div className="absolute inset-0 bg-gradient-to-r from-secondary/95 via-secondary/90 to-secondary/70" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-5rem)] max-w-7xl flex-col px-4 py-6 md:px-6 md:py-8 lg:py-10">
        <div className="grid flex-1 items-start gap-8 lg:grid-cols-2 lg:gap-10 xl:gap-14">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent md:px-4 md:py-1.5 md:text-xs">
              <span className="rounded bg-accent/25 px-1.5 py-0.5 text-[10px] text-white">IN</span>
              India&apos;s Smart Vehicle Sharing Marketplace
            </span>

            <h1 className="mt-4 text-3xl font-bold leading-[1.12] tracking-tight sm:text-4xl md:text-5xl lg:text-[3.25rem] xl:text-6xl">
              <span className="block text-white">Travel Smarter.</span>
              <span className="mt-1 block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent sm:mt-2 lg:hidden">
                Earn Better.
              </span>
            </h1>

            <div className="mt-3 max-w-xl space-y-1.5">
              <p className="text-sm leading-relaxed text-white/90 md:text-base">
                Connect riders and vehicle owners on one trusted platform.
              </p>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                Find affordable rides, self-drive cars, return journeys, and vehicle-with-driver
                services—all powered by AI.
              </p>
            </div>

            <GoogleMapsProvider>
              <HeroSearchForm />
            </GoogleMapsProvider>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="relative hidden min-w-0 flex-col lg:flex lg:items-end"
          >
            <div className="mt-4 flex w-full flex-col items-end gap-2 sm:gap-2.5">
              <Button
                href="/owner/register"
                variant="outline"
                size="lg"
                className="!border-white/50 !text-white hover:!bg-white hover:!text-secondary"
              >
                Register Your Vehicle
              </Button>
              <p className="text-right text-3xl font-bold leading-[1.12] tracking-tight sm:text-4xl md:text-5xl lg:text-[3.25rem] xl:text-6xl">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Earn Better.
                </span>
              </p>
            </div>

            <div className="relative mt-5 w-full max-w-md xl:max-w-lg">
              <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40 ring-1 ring-white/10">
                <Image
                  src="/images/image 3.png"
                  alt="Happy Indian family enjoying a safe ride with Rydez India"
                  width={900}
                  height={620}
                  priority
                  unoptimized
                  className="aspect-[4/3] w-full object-cover object-center"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md">
                <p className="text-xs font-medium uppercase tracking-wide text-accent">Return Journey Marketplace</p>
                <p className="mt-1 text-sm text-white/90">Rydez India&apos;s unique discounted routes</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-14 md:px-6 md:pb-16">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="hero-glass rounded-2xl p-5 md:p-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent md:text-sm">
                Built for Riders &amp; Vehicle Owners
              </p>
              <div className="mt-3 inline-flex w-full rounded-2xl border border-white/15 bg-white/10 p-1 sm:w-auto">
                <button
                  type="button"
                  onClick={() => setAudience("rider")}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none sm:px-5 ${
                    audience === "rider"
                      ? "bg-primary text-white shadow-md"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  For Riders
                </button>
                <button
                  type="button"
                  onClick={() => setAudience("owner")}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none sm:px-5 ${
                    audience === "owner"
                      ? "bg-primary text-white shadow-md"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  For Vehicle Owners
                </button>
              </div>
            </div>
            <div className="flex-1 lg:pl-8">
              <h3 className="text-lg font-bold text-white md:text-xl">
                {audience === "rider" ? "Find the Perfect Ride" : "Earn From Your Vehicle"}
              </h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {(audience === "rider" ? RIDER_FEATURES : OWNER_FEATURES).map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-white/85">
                    <CheckCircle className="h-4 w-4 shrink-0 text-accent" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        <motion.div
          id="download-app"
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="hero-glass-strong mt-8 flex flex-col items-start justify-between gap-5 rounded-2xl p-5 md:flex-row md:items-center md:p-6"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-accent">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white md:text-xl">Download Mobile App</h3>
              <p className="mt-1 text-sm text-white/75">
                Book rides, manage vehicles, track trips, and earn on the go.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <a
              href="https://play.google.com/store"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-black/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black/45"
            >
              Google Play Store
            </a>
            <a
              href="https://apps.apple.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-black/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black/45"
            >
              Apple App Store
            </a>
          </div>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8 flex flex-wrap gap-2.5 md:gap-3"
        >
          {HERO_BADGES.map((badge) => (
            <span
              key={badge}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs text-white/90 backdrop-blur-sm md:text-sm"
            >
              <CheckCircle className="h-3.5 w-3.5 text-accent md:h-4 md:w-4" />
              {badge}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
