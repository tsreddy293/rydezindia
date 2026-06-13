"use client";

import { motion } from "framer-motion";
import { ArrowRight, RefreshCw, TrendingUp, DollarSign } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";

export default function UniqueFeatures() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading
          title="Unique AI-Powered Features"
          subtitle="Revolutionary technology that sets Rydez apart"
        />

        <div className="grid gap-8 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl bg-gradient-to-br from-primary to-primary-dark p-8 md:p-10 text-white"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <ArrowRight className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold">One-Way Journey Marketplace</h3>
            </div>

            <div className="flex items-center gap-4 mb-6 bg-white/10 rounded-2xl p-4">
              <span className="text-lg font-semibold">Hyderabad</span>
              <ArrowRight className="h-5 w-5 text-accent" />
              <span className="text-lg font-semibold">Vijayawada</span>
            </div>

            <p className="text-white/80 mb-4">
              Vehicle owner already travelling on this route. Users can search and book
              available vehicles at significantly lower prices.
            </p>
            <ul className="space-y-2 text-white/70 text-sm">
              <li>• Save up to 40% on intercity travel</li>
              <li>• Book entire vehicle or share seats</li>
              <li>• Verified owners with GPS tracking</li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl bg-gradient-to-br from-secondary to-secondary/90 p-8 md:p-10 text-white border border-accent/20"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20">
                <RefreshCw className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-2xl font-bold">AI Return Journey Matching</h3>
            </div>

            <div className="flex items-center gap-4 mb-6 bg-white/5 rounded-2xl p-4">
              <span className="text-sm text-white/60">Vehicle reaches</span>
              <span className="font-semibold text-accent">Vijayawada</span>
            </div>

            <p className="text-white/80 mb-4">
              AI automatically finds Vijayawada → Hyderabad customers for the return trip.
            </p>

            <div className="grid gap-3 mt-6">
              {[
                { icon: TrendingUp, text: "Reduce empty return trips" },
                { icon: DollarSign, text: "Increase owner earnings by 2x" },
                { icon: ArrowRight, text: "Lower travel costs for users" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                  <Icon className="h-5 w-5 text-accent shrink-0" />
                  <span className="text-sm">{text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
