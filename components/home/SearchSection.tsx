"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MapPin, Calendar, Clock, Search } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";

export default function SearchSection() {
  const router = useRouter();
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [tripType, setTripType] = useState<"one-way" | "round-trip">("one-way");
  const [driveType, setDriveType] = useState<"self-drive" | "chauffeur">("self-drive");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (pickup) params.set("fromCity", pickup);
    if (drop) params.set("toCity", drop);
    if (date) params.set("date", date);
    router.push(`/search?${params.toString()}`);
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Trip Type</label>
              <div className="flex gap-2">
                {(["one-way", "round-trip"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTripType(type)}
                    className={`flex-1 rounded-xl py-3 text-sm font-medium transition ${
                      tripType === type
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {type === "one-way" ? "One Way" : "Round Trip"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Drive Type</label>
              <div className="flex gap-2">
                {(["self-drive", "chauffeur"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDriveType(type)}
                    className={`flex-1 rounded-xl py-3 text-sm font-medium transition ${
                      driveType === type
                        ? "bg-secondary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {type === "self-drive" ? "Self Drive" : "Chauffeur Driven"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
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
