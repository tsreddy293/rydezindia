"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MapPin, Calendar, Clock, Search } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";
import { saveBookingSearchDraft } from "@/lib/booking/booking-draft";

export default function SearchSection() {
  const router = useRouter();
  const [category, setCategory] = useState<"return_journey" | "with_driver" | "self_drive">("return_journey");
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (pickup) params.set("pickupCity", pickup);
    if (drop) params.set("dropCity", drop);
    if (date) params.set("date", date);
    if (time) params.set("time", time);
    if (category === "self_drive") {
      if (returnDate) params.set("returnDate", returnDate);
      if (returnTime) params.set("returnTime", returnTime);
    }

    saveBookingSearchDraft({
      pickupLocation: pickup,
      dropLocation: drop,
      pickupDate: date,
      pickupTime: time,
      returnDate: category === "self_drive" ? returnDate : "",
      returnTime: category === "self_drive" ? returnTime : "",
      serviceType: category,
    });

    if (category === "self_drive") {
      router.push(`/search-self-drive?${params.toString()}`);
      return;
    }

    if (category === "with_driver") {
      router.push(`/search-driver?${params.toString()}`);
      return;
    }

    router.push(`/search-return?${params.toString()}`);
  };

  return (
    <section id="search" className="py-20 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading
          title="Search Vehicle"
          subtitle="Find the perfect vehicle for your journey across India"
        />

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          onSubmit={handleSearch}
          className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100"
        >
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {[
              { key: "return_journey" as const, icon: "🚗", title: "Return Journey", description: "Book empty seats on intercity routes" },
              { key: "with_driver" as const, icon: "🚕", title: "Vehicle With Driver", description: "Hire chauffeur driven vehicles" },
              { key: "self_drive" as const, icon: "🚙", title: "Self Drive", description: "Rent vehicles without driver" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setCategory(item.key)}
                className={`rounded-2xl border p-5 text-left transition ${
                  category === item.key
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-gray-100 bg-gray-50 hover:border-primary/30"
                }`}
              >
                <span className="text-3xl">{item.icon}</span>
                <h3 className="mt-3 font-semibold text-secondary">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{item.description}</p>
              </button>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                <input
                  type="text"
                  placeholder="e.g. Hyderabad"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Drop Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                <input
                  type="text"
                  placeholder="e.g. Vijayawada"
                  value={drop}
                  onChange={(e) => setDrop(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                />
              </div>
            </div>

            {category === "self_drive" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Return Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Return Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                    <input
                      type="time"
                      value={returnTime}
                      onChange={(e) => setReturnTime(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-8 flex justify-center">
            <Button type="submit" variant="primary" size="lg" className="min-w-[200px]">
              <Search className="h-5 w-5" />
              Search Vehicles
            </Button>
          </div>
        </motion.form>
      </div>
    </section>
  );
}
