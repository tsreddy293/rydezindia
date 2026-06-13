"use client";

import Link from "next/link";
import { MapPin, Calendar, Users, IndianRupee, ArrowRight } from "lucide-react";
import { formatDate, formatINR } from "@/lib/utils";
import type { SearchResult } from "@/types/database";

interface Props {
  result: SearchResult;
}

export default function SearchResultCard({ result }: Props) {
  return (
    <Link
      href={`/booking/${result.id}`}
      className="card-hover group block rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-sm"
    >
      <div className="bg-gradient-to-r from-secondary to-primary p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-lg">{result.vehicle_name}</h3>
            <p className="text-sm text-white/70 mt-0.5">{result.vehicle_type}</p>
          </div>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
            {result.available_seats} seats
          </span>
        </div>
      </div>

      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <span>{result.from_city} → {result.to_city}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <span>{formatDate(result.journey_date)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="h-4 w-4 text-primary shrink-0" />
          <span>Owner: {result.owner_name}</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <IndianRupee className="h-4 w-4 text-primary" />
            <span className="text-xl font-bold text-primary">{formatINR(result.price)}</span>
            <span className="text-sm text-gray-500">/ seat</span>
          </div>
          <span className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
            Book Now <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
