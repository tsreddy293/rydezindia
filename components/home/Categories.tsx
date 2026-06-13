"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import SectionHeading from "@/components/ui/SectionHeading";
import { CATEGORIES } from "@/lib/data";

export default function Categories() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading
          title="Vehicle Categories"
          subtitle="From hatchbacks to luxury — find every type of vehicle"
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                href={`/search?category=${cat.id}`}
                className="card-hover flex flex-col items-center rounded-2xl bg-white border border-gray-100 p-6 text-center shadow-sm"
              >
                <span className="text-4xl mb-3">{cat.icon}</span>
                <h3 className="font-semibold text-secondary text-sm md:text-base">{cat.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{cat.count.toLocaleString()} vehicles</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
