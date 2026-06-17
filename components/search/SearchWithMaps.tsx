"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Filter, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import GoogleMapsProvider from "@/components/maps/GoogleMapsProvider";
import PlaceAutocompleteInput from "@/components/maps/PlaceAutocompleteInput";
import RouteInsightsPanel from "@/components/maps/RouteInsightsPanel";
import VehicleSearchResultCard from "@/components/vehicles/VehicleSearchResultCard";
import ReturnJourneyDealCard from "@/components/return-journey/ReturnJourneyDealCard";
import RouteMatchBanner from "@/components/return-journey/RouteMatchBanner";
import { calculateAiPricing } from "@/lib/pricing/ai-pricing-engine";
import { scoreRouteMatch } from "@/lib/services/route-matching";
import { mapDriverTripTypeLabel } from "@/lib/pricing/trip-pricing";
import { LOCAL_RENTAL_PACKAGES } from "@/lib/maps/constants";
import { appendPlaceToParams, buildPlaceFromParts } from "@/lib/maps/url-params";
import type { DriverVehicleResult, SearchResult, SelfDriveResult } from "@/types/database";
import type { PlaceLocation, SearchServiceMode } from "@/lib/maps/types";

const VEHICLE_TYPES = [
  { value: "", label: "All Types" },
  { value: "Hatchback", label: "Hatchback" },
  { value: "Sedan", label: "Sedan" },
  { value: "SUV", label: "SUV" },
  { value: "MUV", label: "MUV" },
  { value: "Luxury", label: "Luxury" },
  { value: "Tempo Traveller", label: "Tempo Traveller" },
];

const TRIP_TYPES = ["", "One Way", "Round Trip", "Multi-City", "Local Rental"];

interface BaseProps {
  mode: SearchServiceMode;
  title: string;
  subtitle?: string;
  connectionError?: string | null;
  showDrop?: boolean;
  showTripType?: boolean;
  showPackage?: boolean;
  citiesLabel?: string;
}

interface ReturnProps extends BaseProps {
  mode: "return_journey";
  results: SearchResult[];
  initialFilters: {
    fromCity: string;
    toCity: string;
    date: string;
    vehicleType: string;
    pickupLat?: string;
    pickupLng?: string;
    pickupAddress?: string;
    dropLat?: string;
    dropLng?: string;
    dropAddress?: string;
  };
}

interface DriverProps extends BaseProps {
  mode: "with_driver";
  results: DriverVehicleResult[];
  initialFilters: {
    pickupCity: string;
    dropCity: string;
    date: string;
    tripType: string;
    vehicleType: string;
    cities?: string;
    pickupLat?: string;
    pickupLng?: string;
    pickupAddress?: string;
    dropLat?: string;
    dropLng?: string;
    dropAddress?: string;
  };
}

interface SelfDriveProps extends BaseProps {
  mode: "self_drive";
  results: SelfDriveResult[];
  initialFilters: {
    pickupCity: string;
    dropCity: string;
    date: string;
    vehicleType: string;
    duration?: string;
    pickupLat?: string;
    pickupLng?: string;
    pickupAddress?: string;
    dropLat?: string;
    dropLng?: string;
    dropAddress?: string;
  };
}

interface LocalRentalProps extends BaseProps {
  mode: "local_rental";
  results: DriverVehicleResult[];
  initialFilters: {
    pickupCity: string;
    date: string;
    vehicleType: string;
    packageKey: string;
    pickupLat?: string;
    pickupLng?: string;
    pickupAddress?: string;
  };
}

type SearchWithMapsProps = ReturnProps | DriverProps | SelfDriveProps | LocalRentalProps;

function SearchWithMapsInner(props: SearchWithMapsProps) {
  const router = useRouter();
  const showDrop = props.showDrop ?? (props.mode !== "self_drive" && props.mode !== "local_rental");

  const [pickup, setPickup] = useState<PlaceLocation | null>(() => {
    if (props.mode === "return_journey") {
      return buildPlaceFromParts(
        props.initialFilters.fromCity,
        props.initialFilters.pickupLat,
        props.initialFilters.pickupLng,
        props.initialFilters.pickupAddress
      );
    }
    if (props.mode === "local_rental") {
      return buildPlaceFromParts(
        props.initialFilters.pickupCity,
        props.initialFilters.pickupLat,
        props.initialFilters.pickupLng,
        props.initialFilters.pickupAddress
      );
    }
    return buildPlaceFromParts(
      props.initialFilters.pickupCity,
      props.initialFilters.pickupLat,
      props.initialFilters.pickupLng,
      props.initialFilters.pickupAddress
    );
  });

  const [drop, setDrop] = useState<PlaceLocation | null>(() => {
    if (props.mode === "return_journey") {
      return buildPlaceFromParts(
        props.initialFilters.toCity,
        props.initialFilters.dropLat,
        props.initialFilters.dropLng,
        props.initialFilters.dropAddress
      );
    }
    if (props.mode === "self_drive" || props.mode === "with_driver") {
      return buildPlaceFromParts(
        props.initialFilters.dropCity,
        props.initialFilters.dropLat,
        props.initialFilters.dropLng,
        props.initialFilters.dropAddress
      );
    }
    return null;
  });

  const [date, setDate] = useState(
    props.mode === "local_rental" ? props.initialFilters.date : props.initialFilters.date
  );
  const [vehicleType, setVehicleType] = useState(props.initialFilters.vehicleType);
  const [tripType, setTripType] = useState(
    props.mode === "with_driver" ? props.initialFilters.tripType : ""
  );
  const [packageKey, setPackageKey] = useState(
    props.mode === "local_rental"
      ? props.initialFilters.packageKey || LOCAL_RENTAL_PACKAGES[0].key
      : LOCAL_RENTAL_PACKAGES[0].key
  );
  const [distanceKm, setDistanceKm] = useState(0);

  const availableSeats = useMemo(() => {
    if (props.mode !== "return_journey") return undefined;
    return props.results.reduce((total, result) => total + (result.available_seats ?? 0), 0);
  }, [props.mode, props.results]);

  const selectedPackage = LOCAL_RENTAL_PACKAGES.find((pkg) => pkg.key === packageKey);

  const routePath =
    props.mode === "return_journey"
      ? "/search-return"
      : props.mode === "with_driver"
        ? "/search-driver"
        : props.mode === "self_drive"
          ? "/search-self-drive"
          : "/search-local";

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    appendPlaceToParams(params, "pickup", pickup);
    if (showDrop) appendPlaceToParams(params, "drop", drop);
    if (date) params.set("date", date);
    if (vehicleType) params.set("vehicleType", vehicleType);

    if (props.mode === "return_journey") {
      if (pickup?.label) params.set("fromCity", pickup.label);
      if (drop?.label) params.set("toCity", drop.label);
    }

    if (props.mode === "with_driver") {
      if (tripType) params.set("tripType", tripType);
      if ("cities" in props.initialFilters && props.initialFilters.cities) {
        params.set("cities", props.initialFilters.cities);
      }
    }

    if (props.mode === "self_drive" && "duration" in props.initialFilters && props.initialFilters.duration) {
      params.set("duration", props.initialFilters.duration);
    }

    if (props.mode === "local_rental") {
      params.set("tripType", "Local Rental");
      params.set("package", packageKey);
    }

    router.push(`${routePath}?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary">{props.title}</h1>
        <p className="mt-1 text-gray-600">
          {props.subtitle ??
            (props.connectionError
              ? "Connection error"
              : `${props.results.length} results found`)}
        </p>
        {"citiesLabel" in props && props.citiesLabel ? (
          <p className="mt-2 text-sm text-primary">{props.citiesLabel}</p>
        ) : null}
      </div>

      <form
        onSubmit={handleSearch}
        className="mb-8 rounded-2xl border bg-white p-5 shadow-sm md:p-6"
      >
        <div className="mb-4 flex items-center gap-2 font-medium text-secondary">
          <Filter className="h-4 w-4 text-primary" />
          Search Filters
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div className={`grid gap-4 ${showDrop ? "sm:grid-cols-2" : "grid-cols-1"}`}>
              <PlaceAutocompleteInput
                id="pickup-location"
                label={props.mode === "return_journey" ? "From Location" : "Pickup City"}
                value={pickup}
                onChange={setPickup}
                placeholder="e.g. Hyderabad"
                variant="light"
                required
              />
              {showDrop ? (
                <PlaceAutocompleteInput
                  id="drop-location"
                  label={props.mode === "return_journey" ? "To Location" : "Drop City"}
                  value={drop}
                  onChange={setDrop}
                  placeholder="e.g. Vijayawada"
                  variant="light"
                  required={props.mode === "return_journey" || props.mode === "with_driver"}
                />
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Date</span>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Vehicle Type</span>
                <select
                  value={vehicleType}
                  onChange={(event) => setVehicleType(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {VEHICLE_TYPES.map((type) => (
                    <option key={type.value || "all"} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              {props.showTripType ? (
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Trip Type</span>
                  <select
                    value={tripType}
                    onChange={(event) => setTripType(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    {TRIP_TYPES.map((type) => (
                      <option key={type || "all"} value={type}>
                        {type || "All Trips"}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {props.showPackage ? (
                <div className="sm:col-span-2">
                  <p className="mb-2 text-sm font-medium text-gray-700">Rental Package</p>
                  <div className="grid grid-cols-2 gap-2">
                    {LOCAL_RENTAL_PACKAGES.map((pkg) => (
                      <button
                        key={pkg.key}
                        type="button"
                        onClick={() => setPackageKey(pkg.key)}
                        className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                          packageKey === pkg.key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-gray-200 bg-white text-gray-700 hover:border-primary/40"
                        }`}
                      >
                        {pkg.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary">
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </div>

          <RouteInsightsPanel
            origin={pickup}
            destination={showDrop ? drop : pickup}
            mode={props.mode}
            variant="light"
            availableSeats={availableSeats}
            localPackagePrice={selectedPackage?.basePrice}
            tripTypeLabel={props.mode === "with_driver" ? tripType : undefined}
            driverTripType={
              props.mode === "with_driver"
                ? tripType === "Round Trip"
                  ? "round_trip"
                  : tripType === "Multi-City"
                    ? "multi_city"
                    : tripType === "One Way"
                      ? "one_way"
                      : undefined
                : undefined
            }
            cityNames={
              props.mode === "with_driver" && props.initialFilters.cities
                ? props.initialFilters.cities.split(",")
                : [pickup?.label ?? "", drop?.label ?? ""].filter(Boolean)
            }
            ratePerKm={
              props.mode === "with_driver" && props.results[0]
                ? props.results[0].rate_per_km
                : undefined
            }
            returnJourneyDiscountPercent={30}
            onRouteUpdate={(data) => setDistanceKm(data.distanceKm)}
          />
        </div>
      </form>

      {props.mode === "return_journey" && pickup?.label && drop?.label && (
        <RouteMatchBanner
          fromCity={pickup.label}
          toCity={drop.label}
          matchCount={props.results.filter((r) =>
            scoreRouteMatch({
              searchFrom: pickup!.label,
              searchTo: drop!.label,
              listingFrom: r.from_city,
              listingTo: r.to_city,
            }) >= 50
          ).length}
        />
      )}

      {!props.connectionError && props.results.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 py-20 text-center">
          <p className="text-lg text-gray-500">No vehicles available</p>
          <p className="mt-2 text-sm text-gray-400">Try adjusting your search filters.</p>
        </div>
      ) : !props.connectionError ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {props.mode === "return_journey"
            ? props.results.map((result) => (
                <ReturnJourneyDealCard key={result.id} journey={result} distanceKm={distanceKm} />
              ))
            : props.mode === "self_drive"
              ? props.results.map((result) => (
                  <VehicleSearchResultCard
                    key={result.id}
                    result={{
                      id: result.id,
                      vehicle_id: result.vehicle_id,
                      vehicle_name: result.vehicle_name,
                      vehicle_number: result.registration_number,
                      vehicle_type: result.vehicle_type,
                      photos: result.photos,
                      price: result.daily_rent || result.price,
                      priceLabel: "/ day",
                      bookingType: "self_drive",
                      owner_city: result.owner_city ?? result.pickup_city,
                      pickup_city: result.pickup_city,
                      security_deposit: result.security_deposit,
                    }}
                  />
                ))
              : props.results.map((result) => {
                  const tripPricingType = mapDriverTripTypeLabel(tripType) ?? "one_way";
                  const pricing = calculateAiPricing({
                    distanceKm: distanceKm || 100,
                    tripType: tripPricingType,
                    vehicleType: result.vehicle_type,
                    fuelType: result.fuel_type,
                    driverRequired: true,
                    ratePerKm: result.rate_per_km,
                  });
                  return (
                    <VehicleSearchResultCard
                      key={result.id}
                      result={{
                        id: result.id,
                        vehicle_id: result.vehicle_id,
                        vehicle_name: result.vehicle_name,
                        vehicle_number: result.vehicle_number,
                        vehicle_type: result.vehicle_type,
                        fuel_type: result.fuel_type,
                        has_ac: result.has_ac,
                        rating: result.rating,
                        seats: result.seats,
                        photos: result.photos,
                        price: result.price,
                        priceLabel: "Est. Fare",
                        bookingType: "with_driver",
                        pickup_city: result.pickup_city,
                        drop_city: result.drop_city,
                      }}
                      distanceKm={distanceKm}
                      estimatedFare={pricing.finalFare}
                    />
                  );
                })}
        </div>
      ) : null}
    </div>
  );
}

export default function SearchWithMaps(props: SearchWithMapsProps) {
  return (
    <GoogleMapsProvider>
      <SearchWithMapsInner {...props} />
    </GoogleMapsProvider>
  );
}

export function SearchReturnClient(props: Omit<ReturnProps, "mode">) {
  return (
    <SearchWithMaps
      {...props}
      mode="return_journey"
      showDrop
      subtitle={
        props.connectionError
          ? "Connection error"
          : `${props.results.length} results found`
      }
    />
  );
}

export function SearchDriverClient(props: Omit<DriverProps, "mode">) {
  return (
    <SearchWithMaps
      {...props}
      mode="with_driver"
      showDrop
      showTripType
      subtitle={
        props.connectionError
          ? "Connection error"
          : `${props.results.length} results found`
      }
      citiesLabel={
        props.initialFilters.cities
          ? `Multi-city route: ${props.initialFilters.cities.split(",").join(" → ")}`
          : undefined
      }
    />
  );
}

export function SearchSelfDriveClient(props: Omit<SelfDriveProps, "mode">) {
  return (
    <SearchWithMaps
      {...props}
      mode="self_drive"
      showDrop={Boolean(props.initialFilters.dropCity)}
      subtitle={
        props.connectionError
          ? "Connection error"
          : `${props.results.length} results found`
      }
    />
  );
}

export function SearchLocalClient(props: Omit<LocalRentalProps, "mode">) {
  return (
    <SearchWithMaps
      {...props}
      mode="local_rental"
      showDrop={false}
      showPackage
      subtitle={
        props.connectionError
          ? "Connection error"
          : `${props.results.length} local rental vehicles found`
      }
    />
  );
}
