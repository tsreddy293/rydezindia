"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Car,
  Fuel,
  IndianRupee,
  MapPin,
  Shield,
  Snowflake,
  Star,
  Users,
} from "lucide-react";
import Button from "@/components/ui/Button";
import TrustBadgeDisplay from "@/components/trust/TrustBadgeDisplay";
import { formatINR } from "@/lib/utils";
import type { TrustBadges } from "@/lib/services/trust-badges";

export interface VehicleSearchCardData {
  id: string;
  vehicle_id?: string;
  vehicle_name: string;
  vehicle_number?: string;
  vehicle_type: string;
  fuel_type?: string;
  has_ac?: boolean;
  rating?: number;
  seats?: number;
  available_seats?: number;
  photos?: string[];
  price: number;
  priceLabel?: string;
  bookingType?: string;
  pickup_city?: string;
  drop_city?: string;
  from_city?: string;
  to_city?: string;
  owner_city?: string;
  security_deposit?: number;
}

interface Props {
  result: VehicleSearchCardData;
  distanceKm?: number;
  estimatedFare?: number;
  showReturnDeal?: boolean;
  discountPercent?: number;
  trustBadges?: Partial<TrustBadges>;
}

export default function VehicleSearchResultCard({
  result,
  distanceKm,
  estimatedFare,
  showReturnDeal,
  discountPercent,
  trustBadges,
}: Props) {
  const [imgError, setImgError] = useState(false);
  const imageUrl = result.photos?.[0];
  const seats = result.available_seats ?? result.seats ?? "-";
  const isSelfDrive = result.bookingType === "self_drive";
  const fare = estimatedFare ?? result.price;
  const bookingQuery = result.bookingType ? `?type=${result.bookingType}` : "";
  const route =
    result.from_city && result.to_city
      ? `${result.from_city} → ${result.to_city}`
      : result.pickup_city && result.drop_city
        ? `${result.pickup_city} → ${result.drop_city}`
        : isSelfDrive
          ? result.owner_city ?? result.pickup_city ?? ""
          : result.pickup_city ?? "";

  const originalFare = showReturnDeal && discountPercent
    ? Math.round(fare / (1 - discountPercent / 100))
    : null;
  const savings = originalFare ? originalFare - fare : 0;

  return (
    <article className="card-hover flex flex-col rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-sm">
      <div className="relative h-44 bg-gradient-to-br from-secondary to-primary">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={result.vehicle_name}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Car className="h-16 w-16 text-white/30" />
          </div>
        )}
        {showReturnDeal && (
          <span className="absolute top-3 left-3 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">
            🔥 Return Journey Deal
          </span>
        )}
        {result.rating && (
          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs text-white">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {result.rating.toFixed(1)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3">
          <h3 className="font-semibold text-lg text-secondary">{result.vehicle_name}</h3>
          {trustBadges && <div className="mt-2"><TrustBadgeDisplay badges={trustBadges} /></div>}
          {result.vehicle_number && (
            <p className="text-xs text-gray-400 mt-0.5">{result.vehicle_number}</p>
          )}
          {isSelfDrive && (
            <p className="text-sm text-gray-500 mt-1">{result.vehicle_type}</p>
          )}
        </div>

        <div className="space-y-2 text-sm text-gray-600 flex-1">
          {route && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">
                {isSelfDrive ? `Owner City: ${route}` : route}
              </span>
            </div>
          )}
          {!isSelfDrive && (
          <div className="flex flex-wrap gap-3">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4 text-primary" />
              {seats} seats
            </span>
            {result.fuel_type && (
              <span className="flex items-center gap-1">
                <Fuel className="h-4 w-4 text-primary" />
                {result.fuel_type}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Snowflake className="h-4 w-4 text-primary" />
              {result.has_ac !== false ? "AC" : "Non AC"}
            </span>
          </div>
          )}
          {isSelfDrive && result.security_deposit !== undefined && result.security_deposit > 0 && (
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              <span>Security Deposit: {formatINR(result.security_deposit)}</span>
            </div>
          )}
          {distanceKm !== undefined && distanceKm > 0 && (
            <p className="text-xs text-gray-400">{distanceKm.toFixed(1)} km</p>
          )}
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4">
          {showReturnDeal && discountPercent && originalFare ? (
            <div className="mb-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Original Fare</span>
                <span className="line-through">{formatINR(originalFare)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Discount {discountPercent}%</span>
                <span>You Save {formatINR(savings)}</span>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1">
                <IndianRupee className="h-4 w-4 text-primary" />
                <span className="text-xl font-bold text-primary">{formatINR(fare)}</span>
              </div>
              <p className="text-xs text-gray-400">
                {result.priceLabel ?? (isSelfDrive ? "Daily Fare" : showReturnDeal ? "Final Fare" : "Est. Fare")}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {!isSelfDrive && (
                <Button href={`/vehicle/${result.id}${bookingQuery}`} variant="outline" size="sm">
                  View Details
                </Button>
              )}
              <Button href={`/booking/${result.id}${bookingQuery}`} variant="primary" size="sm">
                Book Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
