"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

export default function CTA() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary to-accent p-10 md:p-16 text-center"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          <h2 className="relative text-3xl md:text-5xl font-bold text-white mb-4">
            Ready to Transform Your Vehicle Into Income?
          </h2>
          <p className="relative text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of vehicle owners already earning with Rydez India.
            Register today and start earning within 24 hours.
          </p>
          <div className="relative flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/owner/register" variant="secondary" size="lg">
              Register Your Vehicle
            </Button>
            <Button href="/search" size="lg" className="!bg-white !text-primary hover:!bg-white/90">
              Book A Vehicle
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
