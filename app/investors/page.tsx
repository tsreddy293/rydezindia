"use client";

import { motion } from "framer-motion";
import { TrendingUp, Target, DollarSign, Globe, ArrowRight } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import SectionHeading from "@/components/ui/SectionHeading";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import Button from "@/components/ui/Button";
import { INVESTOR_STATS, REVENUE_STREAMS } from "@/lib/data";

export default function InvestorsPage() {
  return (
    <PageLayout>
      <section className="bg-secondary text-white py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold mb-4"
          >
            Invest in the Future of <span className="text-accent">Mobility</span>
          </motion.h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Rydez India is revolutionizing vehicle sharing with AI-powered technology across India&apos;s ₹2.5 lakh crore mobility market.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading title="Market Opportunity" subtitle="India's vehicle sharing market is poised for explosive growth" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {INVESTOR_STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl bg-white border border-gray-100 p-8 text-center shadow-sm card-hover"
              >
                <p className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</p>
                <p className="font-semibold text-secondary mt-2">{stat.label}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading title="Business Model" subtitle="Multiple revenue streams powered by AI technology" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {REVENUE_STREAMS.map((stream, i) => (
              <motion.div
                key={stream.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl bg-white border p-6 shadow-sm card-hover"
              >
                <DollarSign className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-semibold text-secondary text-lg">{stream.title}</h3>
                <p className="text-gray-600 text-sm mt-2">{stream.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading title="Expansion Strategy" subtitle="Scaling across India with technology-first approach" />
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: Target, phase: "Phase 1", title: "South India Launch", desc: "Hyderabad, Bangalore, Chennai, Vijayawada — 4 cities, 5,000 vehicles" },
              { icon: TrendingUp, phase: "Phase 2", title: "Pan-India Expansion", desc: "Mumbai, Delhi, Pune, Kolkata — 20 cities, 25,000 vehicles" },
              { icon: Globe, phase: "Phase 3", title: "National Scale", desc: "50+ cities, 100,000 vehicles, fleet partner program, seat sharing" },
            ].map(({ icon: Icon, phase, title, desc }, i) => (
              <motion.div
                key={phase}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative rounded-2xl bg-secondary text-white p-8"
              >
                <span className="text-accent text-sm font-semibold">{phase}</span>
                <Icon className="h-8 w-8 text-accent my-4" />
                <h3 className="text-xl font-bold mb-2">{title}</h3>
                <p className="text-white/70 text-sm">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-primary to-accent">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Partner With Us</h2>
          <p className="text-white/80 mb-8">
            Join us in building India&apos;s largest AI-powered vehicle sharing platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/contact" variant="secondary" size="lg">
              Contact Investor Relations <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-white/60 text-sm mt-6">
            <AnimatedCounter end={30} suffix="M+" /> idle vehicles ·{" "}
            <AnimatedCounter end={32} suffix="% CAGR" /> market growth
          </p>
        </div>
      </section>
    </PageLayout>
  );
}
