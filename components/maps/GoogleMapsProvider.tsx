"use client";

import { createContext, useContext, useMemo } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_LIBRARIES } from "@/lib/maps/constants";
import { getGoogleMapsApiKey } from "@/lib/maps/env";

interface GoogleMapsContextValue {
  isLoaded: boolean;
  loadError: Error | undefined;
  hasApiKey: boolean;
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  isLoaded: false,
  loadError: undefined,
  hasApiKey: false,
});

export default function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const apiKey = getGoogleMapsApiKey();
  const { isLoaded, loadError } = useJsApiLoader({
    id: "rydez-google-maps",
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const value = useMemo(
    () => ({
      isLoaded: Boolean(apiKey) && isLoaded,
      loadError,
      hasApiKey: Boolean(apiKey),
    }),
    [apiKey, isLoaded, loadError]
  );

  return <GoogleMapsContext.Provider value={value}>{children}</GoogleMapsContext.Provider>;
}

export function useGoogleMaps() {
  return useContext(GoogleMapsContext);
}
