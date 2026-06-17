"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Wallet } from "lucide-react";
import Button from "@/components/ui/Button";

const BENEFITS = [
  "Zero listing fees to get started",
  "AI-powered booking matches",
  "Flexible self-drive & with-driver options",
  "Secure payments & owner dashboard",
];

export default function OwnerEarnings() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-secondary via-[#0d2244] to-[#0a2540] p-6 shadow-2xl shadow-secondary/30 md:p-10 lg:p-14"
        >
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />

          <div className="relative grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
                <Wallet className="h-3.5 w-3.5" />
                For Vehicle Owners
              </span>
              <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
                Earn{" "}
                <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                  ₹20,000 to ₹50,000
                </span>{" "}
                per month
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-white/75 md:text-lg">
                Turn idle vehicles into steady income. Join thousands of verified owners earning on
                India&apos;s fastest-growing return journey marketplace.
              </p>

              <ul className="mt-6 space-y-3">
                {BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 text-sm text-white/85 md:text-base">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    {benefit}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button href="/signup/owner" variant="accent" size="lg">
                  Start Earning Today
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button
                  href="/login/owner"
                  variant="outline"
                  size="lg"
                  className="!border-white/30 !text-white hover:!bg-white hover:!text-secondary"
                >
                  Owner Login
                </Button>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl ring-1 ring-white/10">
                <Image
                  src="/images/image 3.png"
                  alt="Vehicle owner earning with Rydez India"
                  width={640}
                  height={480}
                  unoptimized
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-md md:-bottom-6 md:-left-6">
                <p className="text-xs font-medium uppercase tracking-wide text-accent">Avg. monthly earnings</p>
                <p className="mt-1 text-2xl font-bold text-white">₹35,000</p>
                <p className="text-xs text-white/60">Based on active owners</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
