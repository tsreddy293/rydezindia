"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Calendar, Filter } from "lucide-react";
import SearchResultCard from "@/components/vehicles/SearchResultCard";
import Button from "@/components/ui/Button";
import type { SearchResult } from "@/types/database";

const VEHICLE_TYPES = [
  { value: "", label: "All Types" },
  { value: "Hatchback", label: "Hatchback" },
  { value: "Sedan", label: "Sedan" },
  { value: "SUV", label: "SUV" },
  { value: "MUV", label: "MUV" },
  { value: "Luxury", label: "Luxury" },
  { value: "Tempo Traveller", label: "Tempo Traveller" },
];

interface Props {
  initialResults: SearchResult[];
  initialFilters: {
    fromCity: string;
    toCity: string;
    date: string;
    vehicleType: string;
  };
  connectionError?: string | null;
}

export default function SearchPageClient({
  initialResults,
  initialFilters,
  connectionError,
}: Props) {
  const router = useRouter();
  const [fromCity, setFromCity] = useState(initialFilters.fromCity);
  const [toCity, setToCity] = useState(initialFilters.toCity);
  const [date, setDate] = useState(initialFilters.date);
  const [vehicleType, setVehicleType] = useState(initialFilters.vehicleType);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (fromCity) params.set("fromCity", fromCity);
    if (toCity) params.set("toCity", toCity);
    if (date) params.set("date", date);
    if (vehicleType) params.set("vehicleType", vehicleType);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary">Search Vehicles</h1>
        <p className="text-gray-600 mt-1">
          {connectionError ? "Connection error" : `${initialResults.length} results found`}
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="rounded-2xl bg-white border shadow-sm p-5 md:p-6 mb-8"
      >
        <div className="flex items-center gap-2 mb-4 text-secondary font-medium">
          <Filter className="h-4 w-4 text-primary" />
          Search Filters
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">From City</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <input
                value={fromCity}
                onChange={(e) => setFromCity(e.target.value)}
                placeholder="Hyderabad"
                className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">To City</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <input
                value={toCity}
                onChange={(e) => setToCity(e.target.value)}
                placeholder="Bangalore"
                className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle Type</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {VEHICLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" variant="primary">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
      </form>

      {!connectionError && initialResults.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-gray-50 border border-gray-100">
          <p className="text-gray-500 text-lg">No vehicles available</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting your search filters.</p>
        </div>
      ) : !connectionError ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {initialResults.map((result) => (
            <SearchResultCard key={result.id} result={result} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
