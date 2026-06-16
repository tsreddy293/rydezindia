"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { MapPin } from "lucide-react";
import { useGoogleMaps } from "@/components/maps/GoogleMapsProvider";
import type { PlaceLocation } from "@/lib/maps/types";

type InputVariant = "dark" | "light";

interface PlaceAutocompleteInputProps {
  id?: string;
  label?: string;
  value: PlaceLocation | null;
  onChange: (place: PlaceLocation | null) => void;
  placeholder?: string;
  variant?: InputVariant;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const variantClasses: Record<InputVariant, string> = {
  dark:
    "w-full rounded-xl border border-white/15 bg-black/20 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-accent/60 focus:ring-2 focus:ring-accent/25 md:py-3 md:pl-10 md:pr-4 md:text-base",
  light:
    "w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-secondary outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20",
};

export default function PlaceAutocompleteInput({
  id,
  label,
  value,
  onChange,
  placeholder = "Search location",
  variant = "dark",
  disabled = false,
  required = false,
  className = "",
}: PlaceAutocompleteInputProps) {
  const { isLoaded, hasApiKey } = useGoogleMaps();
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(value?.label ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInputValue(value?.label ?? "");
  }, [value?.label]);

  const emitManualValue = useCallback(
    (nextValue: string) => {
      if (!nextValue.trim()) {
        onChange(null);
        return;
      }
      onChange({
        label: nextValue.trim(),
        formattedAddress: nextValue.trim(),
        lat: 0,
        lng: 0,
      });
    },
    [onChange]
  );

  const handleInputChange = (nextValue: string) => {
    setInputValue(nextValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!hasApiKey || !isLoaded) emitManualValue(nextValue);
    }, 300);
  };

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;

    const formattedAddress = place.formatted_address ?? place.name ?? inputValue;
    const labelText = place.name ?? formattedAddress;

    onChange({
      label: labelText,
      formattedAddress,
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      placeId: place.place_id,
    });
    setInputValue(labelText);
  };

  const inputElement = (
    <div className="relative">
      <MapPin
        className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 md:h-5 md:w-5 ${
          variant === "dark" ? "text-accent" : "text-primary"
        }`}
      />
      <input
        id={id}
        type="text"
        value={inputValue}
        onChange={(event) => handleInputChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete="off"
        className={`${variantClasses[variant]} ${className}`}
      />
    </div>
  );

  return (
    <div>
      {label ? (
        <label
          htmlFor={id}
          className={`mb-1.5 block text-xs font-medium md:text-sm ${
            variant === "dark" ? "text-white/90" : "text-gray-700"
          }`}
        >
          {label}
        </label>
      ) : null}
      {hasApiKey && isLoaded ? (
        <Autocomplete
          onLoad={(instance) => {
            autocompleteRef.current = instance;
          }}
          onPlaceChanged={handlePlaceChanged}
          options={{
            componentRestrictions: { country: "in" },
            fields: ["place_id", "geometry", "formatted_address", "name"],
          }}
        >
          {inputElement}
        </Autocomplete>
      ) : (
        inputElement
      )}
      {!hasApiKey ? (
        <p className={`mt-1 text-[10px] ${variant === "dark" ? "text-white/45" : "text-gray-400"}`}>
          Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for Google Places autocomplete.
        </p>
      ) : null}
    </div>
  );
}
