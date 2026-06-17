"use client";

import { motion } from "framer-motion";
import { Search } from "lucide-react";
import Button from "@/components/ui/Button";

export default function CTA() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary to-accent p-10 text-center md:p-16"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          <h2 className="relative mb-4 text-3xl font-bold text-white md:text-5xl">
            Ready to Travel or Earn with Rydez?
          </h2>
          <p className="relative mx-auto mb-8 max-w-2xl text-base text-white/85 md:text-lg">
            Join India&apos;s smart vehicle sharing marketplace and start your journey today.
          </p>
          <div className="relative flex flex-col justify-center gap-4 sm:flex-row">
            <Button href="/#search" variant="secondary" size="lg">
              <Search className="h-5 w-5" />
              Search Vehicles
            </Button>
            <Button href="/signup/owner" size="lg" className="!bg-white !text-primary hover:!bg-white/90">
              List Your Vehicle
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
