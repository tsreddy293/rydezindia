"use client";

import { motion } from "framer-motion";
import SectionHeading from "@/components/ui/SectionHeading";

const JOURNEYS = [
  {
    title: "For Visitors",
    steps: ["Search Vehicle", "Login or Sign Up", "Book Vehicle"],
  },
  {
    title: "For Owners",
    steps: ["Register Vehicle", "Upload Documents", "Verification", "Receive Bookings"],
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading
          title="How It Works"
          subtitle="A simple journey for people booking vehicles and owners earning from them"
        />

        <div className="grid gap-8 lg:grid-cols-2">
          {JOURNEYS.map((journey, journeyIndex) => (
            <motion.div
              key={journey.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: journeyIndex * 0.1 }}
              className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 md:p-8"
            >
              <h3 className="text-xl font-bold text-secondary">{journey.title}</h3>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {journey.steps.map((step, stepIndex) => (
                  <div key={step} className="rounded-2xl bg-gray-50 p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
                      {stepIndex + 1}
                    </div>
                    <p className="mt-4 font-semibold text-secondary">{step}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl bg-primary/5 p-6 text-center md:p-8">
          <p className="text-sm font-medium text-secondary md:text-base">
            Visitors can search first and create an account when they are ready to book. Owners complete registration, document upload, and verification before receiving bookings.
          </p>
        </div>
      </div>
    </section>
  );
}
