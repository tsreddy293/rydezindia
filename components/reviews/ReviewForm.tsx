"use client";

import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import Button from "@/components/ui/Button";
import FormField from "@/components/forms/FormField";
import { submitTripReview } from "@/server/actions/phase2";

interface Props {
  bookingId: string;
  vehicleId?: string;
  ownerId?: string;
}

function StarRating({ name, label, value, onChange }: {
  name: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-0.5"
          >
            <Star className={`h-6 w-6 ${star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
          </button>
        ))}
        <input type="hidden" name={name} value={value} />
      </div>
    </div>
  );
}

export default function ReviewForm({ bookingId, vehicleId, ownerId }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [ratings, setRatings] = useState({
    overall: 5,
    safety: 5,
    cleanliness: 5,
    comfort: 5,
    driver: 5,
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const result = await submitTripReview({
      bookingId,
      vehicleId,
      ownerId,
      ratingOverall: ratings.overall,
      ratingSafety: ratings.safety,
      ratingCleanliness: ratings.cleanliness,
      ratingComfort: ratings.comfort,
      ratingDriver: ratings.driver,
      comment: String(form.get("comment") ?? ""),
    });
    if (result.success) setDone(true);
    else setError(result.error ?? "Failed");
    setLoading(false);
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-green-50 border border-green-200 p-6 text-center">
        <p className="font-semibold text-green-800">Thank you for your review!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-6 space-y-4 shadow-sm">
      <h3 className="font-semibold text-secondary">Rate Your Trip</h3>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <StarRating name="overall" label="Overall Experience" value={ratings.overall} onChange={(v) => setRatings((r) => ({ ...r, overall: v }))} />
      <div className="grid gap-4 sm:grid-cols-2">
        <StarRating name="safety" label="Safety" value={ratings.safety} onChange={(v) => setRatings((r) => ({ ...r, safety: v }))} />
        <StarRating name="cleanliness" label="Cleanliness" value={ratings.cleanliness} onChange={(v) => setRatings((r) => ({ ...r, cleanliness: v }))} />
        <StarRating name="comfort" label="Comfort" value={ratings.comfort} onChange={(v) => setRatings((r) => ({ ...r, comfort: v }))} />
        <StarRating name="driver" label="Driver Behaviour" value={ratings.driver} onChange={(v) => setRatings((r) => ({ ...r, driver: v }))} />
      </div>
      <FormField label="Comments" name="comment" as="textarea" placeholder="Share your experience..." />
      <Button type="submit" variant="primary" disabled={loading}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : "Submit Review"}
      </Button>
    </form>
  );
}
