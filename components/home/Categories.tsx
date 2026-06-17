"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { HOMEPAGE_CATEGORIES } from "@/lib/data";

export default function Categories() {
  return (
    <section className="bg-gradient-to-b from-white to-gray-50/80 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading
          title="Browse by Vehicle Type"
          subtitle="From everyday hatchbacks to luxury sedans and group travel — find the perfect ride for every trip."
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6 lg:gap-5">
          {HOMEPAGE_CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
            >
              <Link
                href={cat.href}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_20px_40px_rgba(0,123,255,0.12)] md:p-5"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${cat.gradient} text-2xl shadow-md shadow-primary/10 transition group-hover:scale-105 md:h-14 md:w-14 md:text-3xl`}
                >
                  {cat.icon}
                </div>
                <h3 className="font-semibold text-secondary text-sm md:text-base">{cat.name}</h3>
                <p className="mt-1 flex-1 text-[11px] leading-snug text-gray-500 md:text-xs">{cat.tagline}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition group-hover:opacity-100">
                  Explore
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
