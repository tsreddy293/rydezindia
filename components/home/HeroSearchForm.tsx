"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Sparkles, X } from "lucide-react";
import Button from "@/components/ui/Button";
import PlaceAutocompleteInput from "@/components/maps/PlaceAutocompleteInput";
import RouteInsightsPanel from "@/components/maps/RouteInsightsPanel";
import { LOCAL_RENTAL_PACKAGES } from "@/lib/maps/constants";
import { appendPlaceToParams } from "@/lib/maps/url-params";
import { saveBookingSearchDraft } from "@/lib/booking/booking-draft";
import type { PlaceLocation } from "@/lib/maps/types";

type ServiceType = "self_drive" | "with_driver" | "return_journey" | "local_rental";
type SelfDriveDuration = "1_day" | "2_days" | "3_days" | "weekly" | "monthly";
type DriverTripType = "one_way" | "round_trip" | "multi_city";
type LocalRentalPackageKey = (typeof LOCAL_RENTAL_PACKAGES)[number]["key"];

const SERVICE_TYPES: {
  key: ServiceType;
  emoji: string;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  { key: "self_drive", emoji: "🚗", label: "Self Drive", shortLabel: "Self Drive", description: "Rent and drive yourself" },
  { key: "with_driver", emoji: "🚕", label: "Vehicle With Driver", shortLabel: "With Driver", description: "Chauffeur-driven trips" },
  { key: "return_journey", emoji: "🔄", label: "Return Journey Deals", shortLabel: "Return Deals", description: "Discounted return routes" },
  { key: "local_rental", emoji: "🛣️", label: "Local Rental", shortLabel: "Local", description: "Hourly packages with driver" },
];

const SELF_DRIVE_DURATIONS: { key: SelfDriveDuration; label: string }[] = [
  { key: "1_day", label: "1 Day" },
  { key: "2_days", label: "2 Days" },
  { key: "3_days", label: "3 Days" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

const DRIVER_TRIP_TYPES: { key: DriverTripType; label: string }[] = [
  { key: "one_way", label: "One Way" },
  { key: "round_trip", label: "Round Trip" },
  { key: "multi_city", label: "Multi-City" },
];

const MAX_MULTI_CITIES = 5;
const MIN_MULTI_CITIES = 3;

function showsToLocation(service: ServiceType, tripType: DriverTripType) {
  return (service === "with_driver" && tripType !== "multi_city") || service === "return_journey";
}

function isMultiCityTrip(service: ServiceType, tripType: DriverTripType) {
  return service === "with_driver" && tripType === "multi_city";
}

const COMPACT_FIELD_CLASS = "!py-2 text-sm md:!py-2.5";

export default function HeroSearchForm() {
  const router = useRouter();
  const [serviceType, setServiceType] = useState<ServiceType>("with_driver");
  const [selfDriveDuration, setSelfDriveDuration] = useState<SelfDriveDuration>("1_day");
  const [driverTripType, setDriverTripType] = useState<DriverTripType>("one_way");
  const [fromPlace, setFromPlace] = useState<PlaceLocation | null>(null);
  const [toPlace, setToPlace] = useState<PlaceLocation | null>(null);
  const [multiCityPlaces, setMultiCityPlaces] = useState<(PlaceLocation | null)[]>([null, null, null]);
  const [localPackage, setLocalPackage] = useState<LocalRentalPackageKey>("4h_40km");

  const selectedLocalPackage =
    LOCAL_RENTAL_PACKAGES.find((pkg) => pkg.key === localPackage) ?? LOCAL_RENTAL_PACKAGES[0];

  const handleDriverTripTypeChange = (tripType: DriverTripType) => {
    setDriverTripType(tripType);
    if (tripType === "multi_city") {
      setMultiCityPlaces((current) => {
        const seeded = [fromPlace, toPlace, current[2] ?? null].slice(0, MIN_MULTI_CITIES);
        while (seeded.length < MIN_MULTI_CITIES) seeded.push(null);
        return seeded;
      });
    }
  };

  const updateMultiCityPlace = (index: number, place: PlaceLocation | null) => {
    setMultiCityPlaces((current) => current.map((city, i) => (i === index ? place : city)));
  };

  const addMultiCity = () => {
    setMultiCityPlaces((current) =>
      current.length < MAX_MULTI_CITIES ? [...current, null] : current
    );
  };

  const removeMultiCity = (index: number) => {
    setMultiCityPlaces((current) =>
      current.length > MIN_MULTI_CITIES ? current.filter((_, i) => i !== index) : current
    );
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();

    if (isMultiCityTrip(serviceType, driverTripType)) {
      const route = multiCityPlaces.filter((place) => place?.label?.trim());
      if (route.length < MIN_MULTI_CITIES) return;
      appendPlaceToParams(params, "pickup", route[0]);
      appendPlaceToParams(params, "drop", route[route.length - 1] ?? null);
      params.set("cities", route.map((place) => place!.label).join(","));
    } else if (serviceType === "local_rental") {
      if (!fromPlace?.label) return;
      appendPlaceToParams(params, "pickup", fromPlace);
      params.set("package", localPackage);
      params.set("tripType", "Local Rental");
      saveBookingSearchDraft({
        pickupLocation: fromPlace.label,
        dropLocation: "",
        serviceType: "local_rental",
      });
      router.push(`/search-local?${params.toString()}`);
      return;
    } else {
      appendPlaceToParams(params, "pickup", fromPlace);
      if (showsToLocation(serviceType, driverTripType)) {
        appendPlaceToParams(params, "drop", toPlace);
      }
      if (serviceType === "return_journey") {
        if (fromPlace?.label) params.set("fromCity", fromPlace.label);
        if (toPlace?.label) params.set("toCity", toPlace.label);
      }
    }

    const pickupLabel = isMultiCityTrip(serviceType, driverTripType)
      ? multiCityPlaces.find((place) => place?.label?.trim())?.label ?? ""
      : fromPlace?.label ?? "";
    const dropLabel = isMultiCityTrip(serviceType, driverTripType)
      ? [...multiCityPlaces].reverse().find((place) => place?.label?.trim())?.label ?? ""
      : showsToLocation(serviceType, driverTripType)
        ? toPlace?.label ?? ""
        : "";

    saveBookingSearchDraft({
      pickupLocation: pickupLabel,
      dropLocation: dropLabel,
      serviceType,
    });

    switch (serviceType) {
      case "self_drive":
        params.set("duration", selfDriveDuration);
        router.push(`/search-self-drive?${params.toString()}`);
        break;
      case "with_driver": {
        const tripLabels: Record<DriverTripType, string> = {
          one_way: "One Way",
          round_trip: "Round Trip",
          multi_city: "Multi-City",
        };
        params.set("tripType", tripLabels[driverTripType]);
        router.push(`/search-driver?${params.toString()}`);
        break;
      }
      case "return_journey":
        router.push(`/search-return?${params.toString()}`);
        break;
    }
  };

  const activeService = SERVICE_TYPES.find((service) => service.key === serviceType)!;
  const routeMode =
    serviceType === "local_rental"
      ? "local_rental"
      : serviceType === "with_driver"
        ? "with_driver"
        : serviceType === "self_drive"
          ? "self_drive"
          : "return_journey";

  const routeOrigin = isMultiCityTrip(serviceType, driverTripType)
    ? multiCityPlaces.find((place) => place?.lat)
    : fromPlace;
  const routeDestination = isMultiCityTrip(serviceType, driverTripType)
    ? [...multiCityPlaces].reverse().find((place) => place?.lat)
    : showsToLocation(serviceType, driverTripType)
      ? toPlace
      : fromPlace;
  const routeWaypoints = isMultiCityTrip(serviceType, driverTripType)
    ? multiCityPlaces.filter((place): place is PlaceLocation => Boolean(place?.label))
    : [];

  return (
    <motion.form
      id="search"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 }}
      onSubmit={handleSearch}
      className="hero-glass scroll-mt-24 mt-3 rounded-2xl p-3 sm:p-3.5 md:mt-4 md:p-4"
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-accent sm:text-[11px] md:text-xs">
        Choose Service Type
      </p>
      <div
        role="tablist"
        aria-label="Choose service type"
        className="flex gap-0.5 overflow-x-auto rounded-xl border border-white/15 bg-black/25 p-0.5 sm:gap-1 sm:p-1"
      >
        {SERVICE_TYPES.map((service) => {
          const selected = serviceType === service.key;
          return (
            <button
              key={service.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setServiceType(service.key)}
              className={`flex min-w-[72px] flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-[9px] font-semibold transition-all duration-200 sm:min-w-0 sm:gap-1.5 sm:px-2 sm:py-2 sm:text-[10px] md:py-2 md:text-[11px] lg:text-xs ${
                selected
                  ? "bg-gradient-to-r from-primary to-blue-500 text-white shadow-md shadow-primary/30"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="shrink-0 text-xs leading-none sm:text-sm md:text-base">{service.emoji}</span>
              <span className="truncate">
                <span className="sm:hidden">{service.shortLabel}</span>
                <span className="hidden sm:inline">{service.label}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-1 hidden text-[10px] text-white/55 sm:block md:text-[11px]">{activeService.description}</p>

      {serviceType === "with_driver" && (
        <div className="mt-2 md:mt-2.5">
          <p className="mb-1.5 text-[11px] font-medium text-white/90 sm:text-xs md:text-sm">Trip Type</p>
          <div className="flex flex-wrap gap-1 sm:gap-1.5 md:gap-2">
            {DRIVER_TRIP_TYPES.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => handleDriverTripTypeChange(option.key)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition sm:px-3 sm:py-1.5 sm:text-[11px] md:px-4 md:py-2 md:text-sm ${
                  driverTripType === option.key
                    ? "bg-primary text-white shadow-md shadow-primary/30"
                    : "border border-white/20 bg-white/10 text-white/80 hover:bg-white/15"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {serviceType === "local_rental" ? (
          <motion.div
            key="local-rental"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mt-2 space-y-2 md:space-y-2.5"
          >
            <PlaceAutocompleteInput
              id="local-pickup"
              label="Pickup City"
              value={fromPlace}
              onChange={setFromPlace}
              placeholder="e.g. Hyderabad"
              variant="dark"
              className={COMPACT_FIELD_CLASS}
              required
            />
            <div>
              <p className="mb-2 text-xs font-medium text-white/90 md:text-sm">Rental Package</p>
              <div className="grid grid-cols-2 gap-2">
                {LOCAL_RENTAL_PACKAGES.map((pkg) => (
                  <button
                    key={pkg.key}
                    type="button"
                    onClick={() => setLocalPackage(pkg.key)}
                    className={`rounded-xl border px-3 py-2 text-left text-[11px] font-semibold transition md:text-xs ${
                      localPackage === pkg.key
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-white/15 bg-white/10 text-white/85 hover:border-accent/40"
                    }`}
                  >
                    {pkg.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : isMultiCityTrip(serviceType, driverTripType) ? (
          <motion.div
            key="multi-city-route"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mt-2 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-white/90 md:text-sm">Multi-City Route</p>
              {multiCityPlaces.length < MAX_MULTI_CITIES && (
                <button
                  type="button"
                  onClick={addMultiCity}
                  className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/85 transition hover:bg-white/15 md:text-xs"
                >
                  <Plus className="h-3 w-3" />
                  Add City
                </button>
              )}
            </div>
            {multiCityPlaces.map((place, index) => {
              const isFirst = index === 0;
              const isLast = index === multiCityPlaces.length - 1;
              const label =
                multiCityPlaces.length === 2
                  ? isFirst
                    ? "City 1 (Start)"
                    : "City 2 (Final)"
                  : isFirst
                    ? "City 1 (Start)"
                    : isLast
                      ? `City ${index + 1} (Final)`
                      : `City ${index + 1}`;

              return (
                <div key={`city-${index}`} className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <PlaceAutocompleteInput
                      label={label}
                      value={place}
                      onChange={(nextPlace) => updateMultiCityPlace(index, nextPlace)}
                      placeholder={`e.g. ${index === 0 ? "Hyderabad" : index === 1 ? "Vijayawada" : "Visakhapatnam"}`}
                      variant="dark"
                      className={COMPACT_FIELD_CLASS}
                    />
                  </div>
                  {multiCityPlaces.length > MIN_MULTI_CITIES && (
                    <button
                      type="button"
                      onClick={() => removeMultiCity(index)}
                      aria-label={`Remove ${label}`}
                      className="mt-6 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white/70 transition hover:bg-white/15 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="simple-route"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className={`mt-2 grid gap-2 sm:gap-2.5 ${
              showsToLocation(serviceType, driverTripType) ? "sm:grid-cols-2" : "grid-cols-1"
            }`}
          >
            <PlaceAutocompleteInput
              id="from-location"
              label="From Location"
              value={fromPlace}
              onChange={setFromPlace}
              placeholder="e.g. Hyderabad"
              variant="dark"
              className={COMPACT_FIELD_CLASS}
              required
            />
            {showsToLocation(serviceType, driverTripType) && (
              <PlaceAutocompleteInput
                id="to-location"
                label="To Location"
                value={toPlace}
                onChange={setToPlace}
                placeholder="e.g. Vijayawada"
                variant="dark"
                className={COMPACT_FIELD_CLASS}
                required
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={serviceType}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="mt-2 empty:hidden md:mt-2.5"
        >
          {serviceType === "self_drive" && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-white/90 sm:text-xs md:text-sm">Rental Duration</p>
              <div className="flex flex-wrap gap-1 sm:gap-1.5 md:gap-2">
                {SELF_DRIVE_DURATIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSelfDriveDuration(option.key)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition sm:px-3 sm:py-1.5 sm:text-[11px] md:px-4 md:py-2 md:text-sm ${
                      selfDriveDuration === option.key
                        ? "bg-primary text-white shadow-md shadow-primary/30"
                        : "border border-white/20 bg-white/10 text-white/80 hover:bg-white/15"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {serviceType === "return_journey" && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold text-accent sm:px-3 sm:py-1.5 sm:text-[11px] md:text-xs">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Save up to 40% on return journey bookings
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <RouteInsightsPanel
        className="mt-2 md:mt-3"
        origin={routeOrigin ?? null}
        destination={routeDestination ?? null}
        waypoints={
          isMultiCityTrip(serviceType, driverTripType)
            ? routeWaypoints.slice(1, -1)
            : []
        }
        mode={routeMode}
        variant="dark"
        driverTripType={serviceType === "with_driver" ? driverTripType : undefined}
        cityNames={
          isMultiCityTrip(serviceType, driverTripType)
            ? multiCityPlaces.map((place) => place?.label ?? "").filter(Boolean)
            : [fromPlace?.label ?? "", toPlace?.label ?? ""].filter(Boolean)
        }
        localPackagePrice={serviceType === "local_rental" ? selectedLocalPackage.basePrice : undefined}
      />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center md:mt-3.5">
        <Button type="submit" variant="accent" size="lg" className="w-full sm:w-auto sm:min-w-[180px]">
          <Search className="h-5 w-5" />
          Search Vehicles
        </Button>
        <Button
          href="/signup/owner"
          variant="outline"
          size="lg"
          className="hidden w-full !border-white/40 !text-white hover:!bg-white hover:!text-secondary sm:inline-flex sm:w-auto md:hidden"
        >
          Register Your Vehicle
        </Button>
      </div>
    </motion.form>
  );
}
