"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  Car,
  FileUp,
  Search,
  ShieldCheck,
  UserPlus,
  Wallet,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";

const JOURNEYS = [
  {
    title: "For Visitors",
    badge: "Book a Ride",
    accent: "from-primary to-blue-400",
    ring: "ring-primary/20",
    iconBg: "bg-primary/10 text-primary",
    stepBg: "bg-primary/5",
    cta: { label: "Search Vehicles", href: "/#search", variant: "primary" as const },
    steps: [
      {
        title: "Search Vehicle",
        description: "Enter route, journey type, and compare verified vehicles instantly.",
        icon: Search,
      },
      {
        title: "Login or Sign Up",
        description: "Create a free account when you are ready to confirm your booking.",
        icon: UserPlus,
      },
      {
        title: "Book Vehicle",
        description: "Pay securely and connect directly with the vehicle owner.",
        icon: CalendarCheck,
      },
    ],
  },
  {
    title: "For Owners",
    badge: "Earn Income",
    accent: "from-accent to-cyan-300",
    ring: "ring-accent/25",
    iconBg: "bg-accent/15 text-secondary",
    stepBg: "bg-accent/10",
    cta: { label: "List Your Vehicle", href: "/signup/owner", variant: "accent" as const },
    steps: [
      {
        title: "Register Vehicle",
        description: "List your vehicle with route, pricing, and availability details.",
        icon: Car,
      },
      {
        title: "Upload Documents",
        description: "Submit RC, insurance, and identity documents for review.",
        icon: FileUp,
      },
      {
        title: "Verification",
        description: "Our team verifies your profile for a trusted marketplace listing.",
        icon: ShieldCheck,
      },
      {
        title: "Receive Bookings",
        description: "Get AI-matched bookings and secure payments after approval.",
        icon: Wallet,
      },
    ],
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-gray-50 py-20 md:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,123,255,0.08),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(0,212,255,0.08),transparent_40%)]" />

      <div className="relative mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading
          title="How It Works"
          subtitle="A simple journey for people booking vehicles and owners earning from them"
        />

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          {JOURNEYS.map((journey, journeyIndex) => (
            <motion.article
              key={journey.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: journeyIndex * 0.1, duration: 0.5 }}
              className={`group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-lg shadow-gray-200/60 ring-1 ${journey.ring} md:p-8`}
            >
              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${journey.accent}`} />

              <div className="flex items-start justify-between gap-4">
                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${journey.iconBg}`}
                  >
                    {journey.badge}
                  </span>
                  <h3 className="mt-3 text-2xl font-bold text-secondary md:text-3xl">{journey.title}</h3>
                </div>
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${journey.iconBg}`}
                >
                  {journeyIndex === 0 ? (
                    <Search className="h-7 w-7" />
                  ) : (
                    <Car className="h-7 w-7" />
                  )}
                </div>
              </div>

              <ol className="relative mt-8 space-y-0">
                {journey.steps.map((step, stepIndex) => {
                  const Icon = step.icon;
                  const isLast = stepIndex === journey.steps.length - 1;

                  return (
                    <li key={step.title} className="relative flex gap-4 pb-8 last:pb-0">
                      {!isLast && (
                        <span
                          className={`absolute left-5 top-12 h-[calc(100%-2rem)] w-0.5 bg-gradient-to-b ${
                            journeyIndex === 0
                              ? "from-primary/40 to-primary/10"
                              : "from-accent/50 to-accent/10"
                          }`}
                          aria-hidden
                        />
                      )}

                      <div
                        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-md ${
                          journeyIndex === 0
                            ? "bg-gradient-to-br from-primary to-blue-500"
                            : "bg-gradient-to-br from-accent to-cyan-400 text-secondary"
                        }`}
                      >
                        {stepIndex + 1}
                      </div>

                      <div className={`flex-1 rounded-2xl p-4 transition group-hover:shadow-sm ${journey.stepBg}`}>
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 rounded-lg p-2 ${journey.iconBg}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-secondary">{step.title}</p>
                            <p className="mt-1 text-sm leading-relaxed text-gray-600">{step.description}</p>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-8 border-t border-gray-100 pt-6">
                <Button href={journey.cta.href} variant={journey.cta.variant} size="md" className="w-full sm:w-auto">
                  {journey.cta.label}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="relative mt-10 overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-r from-secondary via-[#0d1f3c] to-primary p-6 text-center md:mt-12 md:p-10"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />
          <p className="relative mx-auto max-w-3xl text-sm leading-relaxed text-white/85 md:text-base">
            Visitors can search first and create an account when they are ready to book. Owners complete
            registration, document upload, and verification before receiving bookings on India&apos;s smart
            vehicle sharing marketplace.
          </p>
          <div className="relative mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href="/#search" variant="accent" size="md">
              Search Vehicles
            </Button>
            <Button
              href="/signup/owner"
              variant="outline"
              size="md"
              className="!border-white/30 !text-white hover:!bg-white/10 hover:!text-white"
            >
              Register Your Vehicle
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
