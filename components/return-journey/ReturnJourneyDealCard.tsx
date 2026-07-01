"use client";

import AuthAwareBookingLink from "@/components/booking/AuthAwareBookingLink";
import { Calendar, MapPin, Users } from "lucide-react";
import VehicleSearchResultCard from "@/components/vehicles/VehicleSearchResultCard";
import { resolveReturnJourneyPricePerSeat } from "@/lib/pricing/return-journey-pricing";
import { formatDate } from "@/lib/utils";
import type { SearchResult } from "@/types/database";

interface Props {
  journey: SearchResult & {
    return_from_city?: string;
    return_to_city?: string;
    return_departure_time?: string;
    discount_percent?: number;
    driver_name?: string;
    driver_phone?: string;
    photos?: string[];
    fuel_type?: string;
    has_ac?: boolean;
    rating?: number;
    vehicle_number?: string;
  };
  distanceKm?: number;
}

export default function ReturnJourneyDealCard({ journey, distanceKm = 0 }: Props) {
  const discountPercent = journey.discount_percent ?? 0;
  const pricePerSeat = resolveReturnJourneyPricePerSeat(journey);

  const cardData = {
    id: journey.id,
    vehicle_id: journey.vehicle_id ?? undefined,
    vehicle_name: journey.vehicle_name,
    vehicle_number: journey.vehicle_number,
    vehicle_type: journey.vehicle_type,
    fuel_type: journey.fuel_type,
    has_ac: journey.has_ac,
    rating: journey.rating,
    available_seats: journey.available_seats,
    photos: journey.photos,
    price: pricePerSeat,
    from_city: journey.from_city,
    to_city: journey.to_city,
  };

  return (
    <div className="space-y-3">
      <VehicleSearchResultCard
        result={cardData}
        distanceKm={distanceKm}
        estimatedFare={pricePerSeat}
        showReturnDeal
        discountPercent={discountPercent > 0 ? discountPercent : undefined}
      />
      <div className="rounded-xl bg-orange-50 border border-orange-100 p-4 text-sm space-y-2">
        <p className="font-semibold text-orange-800">
          Save Up To 40% on Return Journey
        </p>
        {journey.return_from_city && journey.return_to_city && (
          <p className="flex items-center gap-2 text-gray-600">
            <MapPin className="h-4 w-4 text-orange-500" />
            Return: {journey.return_from_city} → {journey.return_to_city}
            {journey.return_departure_time && ` at ${journey.return_departure_time}`}
          </p>
        )}
        <div className="flex flex-wrap gap-4 text-gray-600">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDate(journey.journey_date)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {journey.available_seats} seats left
          </span>
        </div>
        {journey.driver_name && (
          <p className="text-gray-500">Driver: {journey.driver_name}</p>
        )}
        <AuthAwareBookingLink href={`/booking/${journey.id}`}>
          Book return deal →
        </AuthAwareBookingLink>
      </div>
    </div>
  );
}
