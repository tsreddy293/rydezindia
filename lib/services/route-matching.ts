/** City aliases for smart route matching (South India) */
const CITY_ALIASES: Record<string, string[]> = {
  hyderabad: ["hyd", "secunderabad", "sec'bad"],
  visakhapatnam: ["vizag", "visakha", "waltair"],
  vijayawada: ["bezawada", "vja"],
  rajahmundry: ["rajahmahendravaram", "rjy"],
  tirupati: ["tirupathi"],
  warangal: ["hanamkonda"],
  guntur: [],
  kakinada: [],
  amalapuram: [],
  bangalore: ["bengaluru", "blr"],
  chennai: ["madras"],
};

function normalizeCity(city: string): string {
  return city.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

function expandCity(city: string): Set<string> {
  const normalized = normalizeCity(city);
  const variants = new Set<string>([normalized]);

  for (const [canonical, aliases] of Object.entries(CITY_ALIASES)) {
    const all = [canonical, ...aliases];
    if (all.some((a) => normalized.includes(a) || a.includes(normalized))) {
      all.forEach((a) => variants.add(a));
      variants.add(canonical);
    }
  }

  return variants;
}

export function citiesMatch(searchCity: string, listingCity: string): boolean {
  if (!searchCity || !listingCity) return false;
  const searchVariants = expandCity(searchCity);
  const listingVariants = expandCity(listingCity);
  for (const s of searchVariants) {
    for (const l of listingVariants) {
      if (s.includes(l) || l.includes(s)) return true;
    }
  }
  return false;
}

export interface RouteMatchInput {
  searchFrom: string;
  searchTo: string;
  listingFrom: string;
  listingTo: string;
}

export function scoreRouteMatch(input: RouteMatchInput): number {
  const fromMatch = citiesMatch(input.searchFrom, input.listingFrom);
  const toMatch = citiesMatch(input.searchTo, input.listingTo);
  if (fromMatch && toMatch) return 100;
  if (fromMatch || toMatch) return 50;
  return 0;
}

export function isReturnJourneyMatch(
  customerFrom: string,
  customerTo: string,
  returnFrom: string,
  returnTo: string
): boolean {
  return citiesMatch(customerFrom, returnFrom) && citiesMatch(customerTo, returnTo);
}

export const POPULAR_ROUTES = [
  { from: "Hyderabad", to: "Vijayawada" },
  { from: "Hyderabad", to: "Visakhapatnam" },
  { from: "Hyderabad", to: "Tirupati" },
  { from: "Hyderabad", to: "Warangal" },
  { from: "Vijayawada", to: "Guntur" },
  { from: "Rajahmundry", to: "Kakinada" },
  { from: "Kakinada", to: "Amalapuram" },
  { from: "Rajahmundry", to: "Amalapuram" },
] as const;
