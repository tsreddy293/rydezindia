"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { activateSos } from "@/server/actions/phase2";

interface Props {
  bookingId?: string;
}

export default function SosButton({ bookingId }: Props) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSos() {
    if (!confirm("Trigger emergency SOS? Your emergency contacts and Rydez support will be notified.")) return;
    setLoading(true);
    let latitude: number | undefined;
    let longitude: number | undefined;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // location unavailable
      }
    }
    const result = await activateSos({ bookingId, latitude, longitude });
    if (result.success) setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="rounded-2xl bg-red-50 border-2 border-red-300 p-4 text-center">
        <p className="font-bold text-red-700">SOS Sent</p>
        <p className="text-sm text-red-600 mt-1">Help is on the way. Stay safe.</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSos}
      disabled={loading}
      className="fixed bottom-24 right-4 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-colors md:bottom-8"
      aria-label="Emergency SOS"
    >
      <span className="text-xs font-bold">{loading ? "..." : "SOS"}</span>
    </button>
  );
}
