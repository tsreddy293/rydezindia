"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { REVIEWS } from "@/lib/data";

export default function Testimonials() {
  const ownerReviews = REVIEWS.filter((r) => r.role === "owner");
  const customerReviews = REVIEWS.filter((r) => r.role === "customer");

  return (
    <section id="testimonials" className="py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading
          title="Success Stories"
          subtitle="Hear from our verified owners and happy customers"
        />

        <div className="mb-12">
          <h3 className="text-xl font-semibold text-secondary mb-6 text-center">Owner Reviews</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ownerReviews.map((review, i) => (
              <ReviewCard key={review.id} review={review} delay={i * 0.1} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-secondary mb-6 text-center">Customer Reviews</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {customerReviews.map((review, i) => (
              <ReviewCard key={review.id} review={review} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewCard({ review, delay }: { review: typeof REVIEWS[0]; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm card-hover relative"
    >
      <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10" />
      <div className="flex items-center gap-3 mb-4">
        <Image
          src={review.avatar}
          alt={review.author}
          width={48}
          height={48}
          className="rounded-full object-cover"
        />
        <div>
          <p className="font-semibold text-secondary">{review.author}</p>
          <div className="flex items-center gap-1">
            {Array.from({ length: review.rating }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
        </div>
      </div>
      <p className="text-gray-600 text-sm leading-relaxed">{review.text}</p>
      <p className="mt-3 text-xs text-gray-400">{review.date}</p>
    </motion.div>
  );
}
