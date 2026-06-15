"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, MapPin, Plus, Search, Smartphone, Sparkles, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { HERO_BADGES } from "@/lib/data";

type ServiceType = "self_drive" | "with_driver" | "return_journey";
type Audience = "rider" | "owner";
type SelfDriveDuration = "1_day" | "2_days" | "3_days" | "weekly" | "monthly";
type DriverTripType = "one_way" | "round_trip" | "multi_city";

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

const POPULAR_RETURN_ROUTES = [
  { from: "Hyderabad", to: "Vijayawada" },
  { from: "Vijayawada", to: "Hyderabad" },
  { from: "Chennai", to: "Bangalore" },
  { from: "Bangalore", to: "Chennai" },
];

const RIDER_FEATURES = [
  "Book Affordable Rides",
  "Return Journey Marketplace",
  "Self Drive Vehicles",
  "Vehicle With Driver",
];

const OWNER_FEATURES = [
  "Register Vehicle",
  "Receive Bookings",
  "Earn Income",
];

const MAX_MULTI_CITIES = 5;
const MIN_MULTI_CITIES = 3;

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

function showsToLocation(service: ServiceType, tripType: DriverTripType) {
  return (service === "with_driver" && tripType !== "multi_city") || service === "return_journey";
}

function isMultiCityTrip(service: ServiceType, tripType: DriverTripType) {
  return service === "with_driver" && tripType === "multi_city";
}

export default function Hero() {
  const router = useRouter();
  const [serviceType, setServiceType] = useState<ServiceType>("return_journey");
  const [selfDriveDuration, setSelfDriveDuration] = useState<SelfDriveDuration>("1_day");
  const [driverTripType, setDriverTripType] = useState<DriverTripType>("one_way");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [multiCities, setMultiCities] = useState(["", "", ""]);
  const [audience, setAudience] = useState<Audience>("rider");

  const handleDriverTripTypeChange = (tripType: DriverTripType) => {
    setDriverTripType(tripType);
    if (tripType === "multi_city") {
      setMultiCities((current) => {
        const seeded = [fromLocation, toLocation, current[2] ?? ""].slice(0, MIN_MULTI_CITIES);
        while (seeded.length < MIN_MULTI_CITIES) seeded.push("");
        return seeded;
      });
    }
  };

  const updateMultiCity = (index: number, value: string) => {
    setMultiCities((current) => current.map((city, i) => (i === index ? value : city)));
  };

  const addMultiCity = () => {
    setMultiCities((current) => (current.length < MAX_MULTI_CITIES ? [...current, ""] : current));
  };

  const removeMultiCity = (index: number) => {
    setMultiCities((current) =>
      current.length > MIN_MULTI_CITIES ? current.filter((_, i) => i !== index) : current
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();

    if (isMultiCityTrip(serviceType, driverTripType)) {
      const route = multiCities.map((city) => city.trim()).filter(Boolean);
      if (route.length < MIN_MULTI_CITIES) return;
      params.set("pickupCity", route[0]);
      params.set("dropCity", route[route.length - 1]);
      params.set("cities", route.join(","));
    } else {
      if (fromLocation) params.set("pickupCity", fromLocation);
      if (showsToLocation(serviceType, driverTripType) && toLocation) {
        params.set("dropCity", toLocation);
      }
    }

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

  const applyReturnRoute = (from: string, to: string) => {
    setServiceType("return_journey");
    setFromLocation(from);
    setToLocation(to);
  };

  const activeService = SERVICE_TYPES.find((service) => service.key === serviceType)!;

  return (
    <section className="relative overflow-hidden bg-secondary">
      <div className="absolute inset-0 bg-gradient-to-br from-secondary via-[#0d1f3c] to-[#0a2540]" />
      <div className="absolute inset-0 opacity-20">
        <Image
          src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&q=60"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          aria-hidden
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-secondary/95 via-secondary/90 to-secondary/70" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-5rem)] max-w-7xl flex-col px-4 py-6 md:px-6 md:py-8 lg:py-10">
        <div className="grid flex-1 items-start gap-8 lg:grid-cols-2 lg:gap-10 xl:gap-14">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent md:px-4 md:py-1.5 md:text-xs">
              <span className="rounded bg-accent/25 px-1.5 py-0.5 text-[10px] text-white">IN</span>
              India&apos;s Smart Vehicle Sharing Marketplace
            </span>

            <h1 className="mt-4 text-3xl font-bold leading-[1.12] tracking-tight sm:text-4xl md:text-5xl lg:text-[3.25rem] xl:text-6xl">
              <span className="block text-white">Travel Smarter.</span>
              <span className="mt-1 block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent sm:mt-2 lg:hidden">
                Earn Better.
              </span>
            </h1>

            <div className="mt-3 max-w-xl space-y-1.5">
              <p className="text-sm leading-relaxed text-white/90 md:text-base">
                Connect riders and vehicle owners on one trusted platform.
              </p>
              <p className="text-sm leading-relaxed text-white/75 md:text-base">
                Find affordable rides, self-drive cars, return journeys, and vehicle-with-driver
                services—all powered by AI.
              </p>
            </div>

            <motion.form
              id="search"
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.08 }}
              onSubmit={handleSearch}
              className="hero-glass mt-5 rounded-2xl p-4 md:mt-6 md:p-5"
            >
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-accent md:text-xs">
                Choose Service Type
              </p>
              <div
                role="tablist"
                aria-label="Choose service type"
                className="flex gap-1 rounded-xl border border-white/15 bg-black/25 p-1"
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
                      className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[10px] font-semibold transition-all duration-200 sm:px-2.5 sm:text-[11px] md:py-2.5 md:text-xs ${
                        selected
                          ? "bg-gradient-to-r from-primary to-blue-500 text-white shadow-md shadow-primary/30"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className="shrink-0 text-sm leading-none md:text-base">{service.emoji}</span>
                      <span className="truncate">
                        <span className="sm:hidden">{service.shortLabel}</span>
                        <span className="hidden sm:inline">{service.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-white/55 md:text-xs">{activeService.description}</p>

              {serviceType === "with_driver" && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-white/90 md:text-sm">Trip Type</p>
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {DRIVER_TRIP_TYPES.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => handleDriverTripTypeChange(option.key)}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition md:px-4 md:py-2 md:text-sm ${
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
                {isMultiCityTrip(serviceType, driverTripType) ? (
                  <motion.div
                    key="multi-city-route"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="mt-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-white/90 md:text-sm">Multi-City Route</p>
                      {multiCities.length < MAX_MULTI_CITIES && (
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
                    {multiCities.map((city, index) => {
                      const isFirst = index === 0;
                      const isLast = index === multiCities.length - 1;
                      const label =
                        multiCities.length === 2
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
                          <div className="relative min-w-0 flex-1">
                            <label className="mb-1.5 block text-[11px] font-medium text-white/90 md:text-xs">
                              {label}
                            </label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
                              <input
                                type="text"
                                placeholder={`e.g. ${index === 0 ? "Hyderabad" : index === 1 ? "Vijayawada" : "Chennai"}`}
                                value={city}
                                onChange={(e) => updateMultiCity(index, e.target.value)}
                                className="w-full rounded-xl border border-white/15 bg-black/20 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-accent/60 focus:ring-2 focus:ring-accent/25"
                              />
                            </div>
                          </div>
                          {multiCities.length > MIN_MULTI_CITIES && (
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
                    <p className="text-[11px] text-white/55 md:text-xs">
                      Add every city in your travel order. Minimum 3 cities for multi-city trips.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="simple-route"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className={`mt-3 grid gap-3 ${
                      showsToLocation(serviceType, driverTripType) ? "sm:grid-cols-2 sm:gap-4" : "grid-cols-1"
                    }`}
                  >
                    <div>
                      <label htmlFor="from-location" className="mb-1.5 block text-xs font-medium text-white/90 md:text-sm">
                        From Location
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent md:h-5 md:w-5" />
                        <input
                          id="from-location"
                          type="text"
                          placeholder="e.g. Hyderabad"
                          value={fromLocation}
                          onChange={(e) => setFromLocation(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-black/20 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-accent/60 focus:ring-2 focus:ring-accent/25 md:py-3 md:pl-10 md:pr-4 md:text-base"
                        />
                      </div>
                    </div>

                    {showsToLocation(serviceType, driverTripType) && (
                      <div>
                        <label htmlFor="to-location" className="mb-1.5 block text-xs font-medium text-white/90 md:text-sm">
                          To Location
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent md:h-5 md:w-5" />
                          <input
                            id="to-location"
                            type="text"
                            placeholder="e.g. Vijayawada"
                            value={toLocation}
                            onChange={(e) => setToLocation(e.target.value)}
                            className="w-full rounded-xl border border-white/15 bg-black/20 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-accent/60 focus:ring-2 focus:ring-accent/25 md:py-3 md:pl-10 md:pr-4 md:text-base"
                          />
                        </div>
                        {serviceType === "with_driver" && driverTripType === "round_trip" && (
                          <p className="mt-1.5 text-[11px] text-white/55 md:text-xs">
                            Round trip returns to your starting city.
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.div
                  key={serviceType}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="mt-4"
                >
                  {serviceType === "self_drive" && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-white/90 md:text-sm">Rental Duration</p>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {SELF_DRIVE_DURATIONS.map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setSelfDriveDuration(option.key)}
                            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition md:px-4 md:py-2 md:text-sm ${
                              selfDriveDuration === option.key
                                ? "bg-primary text-white shadow-md shadow-primary/30"
                                : "border border-white/20 bg-white/10 text-white/80 hover:bg-white/15"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-white/60">Rent the vehicle and drive yourself.</p>
                    </div>
                  )}

                  {serviceType === "return_journey" && (
                    <div>
                      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold text-accent md:text-xs">
                        <Sparkles className="h-3 w-3" />
                        Save up to 40% on return journey bookings
                      </div>
                      <p className="mb-1.5 text-[11px] font-medium text-white/90 md:text-xs">
                        Popular Return Journey Deals
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {POPULAR_RETURN_ROUTES.map((route) => (
                          <button
                            key={`${route.from}-${route.to}`}
                            type="button"
                            onClick={() => applyReturnRoute(route.from, route.to)}
                            className="rounded-lg border border-white/15 bg-white/10 px-2 py-1.5 text-left text-[10px] text-white/90 transition hover:border-accent/40 hover:bg-white/15 md:text-xs"
                          >
                            <span className="font-semibold text-white">{route.from}</span>
                            <span className="mx-1 text-accent">→</span>
                            <span className="font-semibold text-white">{route.to}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row md:mt-5">
                <Button type="submit" variant="accent" size="lg" className="w-full sm:w-auto sm:min-w-[200px]">
                  <Search className="h-5 w-5" />
                  Search Vehicles
                </Button>
                <Button
                  href="/owner/register"
                  variant="outline"
                  size="lg"
                  className="w-full !border-white/40 !text-white hover:!bg-white hover:!text-secondary sm:w-auto lg:hidden"
                >
                  Register Your Vehicle
                </Button>
              </div>
            </motion.form>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="relative hidden min-w-0 flex-col lg:flex lg:items-end"
          >
            <div className="mt-4 flex w-full flex-col items-end gap-2 sm:gap-2.5">
              <Button
                href="/owner/register"
                variant="outline"
                size="lg"
                className="!border-white/50 !text-white hover:!bg-white hover:!text-secondary"
              >
                Register Your Vehicle
              </Button>
              <p className="text-right text-3xl font-bold leading-[1.12] tracking-tight sm:text-4xl md:text-5xl lg:text-[3.25rem] xl:text-6xl">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Earn Better.
                </span>
              </p>
            </div>

            <div className="relative mt-5 w-full max-w-md xl:max-w-lg">
              <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40 ring-1 ring-white/10">
                <Image
                  src="/images/image 3.png"
                  alt="Happy Indian family enjoying a safe ride with Rydez India"
                  width={900}
                  height={620}
                  priority
                  unoptimized
                  className="aspect-[4/3] w-full object-cover object-center"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md">
                <p className="text-xs font-medium uppercase tracking-wide text-accent">Return Journey Marketplace</p>
                <p className="mt-1 text-sm text-white/90">Rydez India&apos;s unique discounted routes</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-14 md:px-6 md:pb-16">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="hero-glass rounded-2xl p-5 md:p-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent md:text-sm">
                Built for Riders &amp; Vehicle Owners
              </p>
              <div className="mt-3 inline-flex w-full rounded-2xl border border-white/15 bg-white/10 p-1 sm:w-auto">
                <button
                  type="button"
                  onClick={() => setAudience("rider")}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none sm:px-5 ${
                    audience === "rider"
                      ? "bg-primary text-white shadow-md"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  For Riders
                </button>
                <button
                  type="button"
                  onClick={() => setAudience("owner")}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none sm:px-5 ${
                    audience === "owner"
                      ? "bg-primary text-white shadow-md"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  For Vehicle Owners
                </button>
              </div>
            </div>
            <div className="flex-1 lg:pl-8">
              <h3 className="text-lg font-bold text-white md:text-xl">
                {audience === "rider" ? "Find the Perfect Ride" : "Earn From Your Vehicle"}
              </h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {(audience === "rider" ? RIDER_FEATURES : OWNER_FEATURES).map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-white/85">
                    <CheckCircle className="h-4 w-4 shrink-0 text-accent" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        <motion.div
          id="download-app"
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="hero-glass-strong mt-8 flex flex-col items-start justify-between gap-5 rounded-2xl p-5 md:flex-row md:items-center md:p-6"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-accent">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white md:text-xl">Download Mobile App</h3>
              <p className="mt-1 text-sm text-white/75">
                Book rides, manage vehicles, track trips, and earn on the go.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <a
              href="https://play.google.com/store"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-black/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black/45"
            >
              Google Play Store
            </a>
            <a
              href="https://apps.apple.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-black/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black/45"
            >
              Apple App Store
            </a>
          </div>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8 flex flex-wrap gap-2.5 md:gap-3"
        >
          {HERO_BADGES.map((badge) => (
            <span
              key={badge}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs text-white/90 backdrop-blur-sm md:text-sm"
            >
              <CheckCircle className="h-3.5 w-3.5 text-accent md:h-4 md:w-4" />
              {badge}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
