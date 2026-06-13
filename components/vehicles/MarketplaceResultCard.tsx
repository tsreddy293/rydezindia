import Link from "next/link";
import { Calendar, Car, IndianRupee, MapPin, Shield, Users } from "lucide-react";
import { formatDate, formatINR } from "@/lib/utils";
import type { DriverVehicleResult, SelfDriveResult } from "@/types/database";

type Props =
  | { type: "self_drive"; result: SelfDriveResult }
  | { type: "with_driver"; result: DriverVehicleResult };

export default function MarketplaceResultCard({ type, result }: Props) {
  const isSelfDrive = type === "self_drive";
  const href = `/booking/${result.id}?type=${type}`;
  const route = result.drop_city
    ? `${result.pickup_city} → ${result.drop_city}`
    : result.pickup_city || (isSelfDrive ? (result as SelfDriveResult).location : (result as DriverVehicleResult).base_location);
  const price = result.price || (isSelfDrive ? (result as SelfDriveResult).daily_rent : (result as DriverVehicleResult).rate_per_km);
  const priceSuffix = isSelfDrive ? "/ day" : "/ full vehicle";

  return (
    <Link
      href={href}
      className="card-hover group block rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-sm"
    >
      <div className="bg-gradient-to-r from-secondary to-primary p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-lg">{result.vehicle_name}</h3>
            <p className="text-sm text-white/70 mt-0.5">{result.vehicle_type}</p>
          </div>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
            {isSelfDrive ? "Self Drive" : "With Driver"}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <span>{route}</span>
        </div>
        {result.journey_date && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <span>{formatDate(result.journey_date)}{result.journey_time ? ` at ${result.journey_time}` : ""}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="h-4 w-4 text-primary shrink-0" />
          <span>{result.available_seats || result.seats || "-"} seats</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Shield className="h-4 w-4 text-primary shrink-0" />
          <span>Owner: {result.owner_name}</span>
        </div>
        {!isSelfDrive && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Car className="h-4 w-4 text-primary shrink-0" />
            <span>Driver: {(result as DriverVehicleResult).driver_name}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <IndianRupee className="h-4 w-4 text-primary" />
            <span className="text-xl font-bold text-primary">{formatINR(price)}</span>
            <span className="text-sm text-gray-500">{priceSuffix}</span>
          </div>
          <span className="text-sm font-medium text-primary">
            {isSelfDrive ? "Check Availability" : "Book Trip"}
          </span>
        </div>
      </div>
    </Link>
  );
}
