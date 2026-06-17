import { Route } from "lucide-react";

interface Props {
  fromCity: string;
  toCity: string;
  matchCount: number;
}

export default function RouteMatchBanner({ fromCity, toCity, matchCount }: Props) {
  if (matchCount <= 0) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
      <Route className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-green-800">
          Matching Return Journey Available
        </p>
        <p className="text-sm text-green-700 mt-1">
          {matchCount} return deal{matchCount > 1 ? "s" : ""} found for{" "}
          {fromCity} → {toCity}. Save up to 40% on your return trip!
        </p>
      </div>
    </div>
  );
}
