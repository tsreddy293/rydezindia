export interface SeoRoute {
  slug: string;
  from: string;
  to: string;
  distanceKm: number;
  description: string;
}

export const SEO_ROUTES: SeoRoute[] = [
  {
    slug: "hyderabad-to-vijayawada",
    from: "Hyderabad",
    to: "Vijayawada",
    distanceKm: 275,
    description: "Book affordable cabs and return journey deals from Hyderabad to Vijayawada. One-way, round-trip, and shared return seats available.",
  },
  {
    slug: "vijayawada-to-hyderabad",
    from: "Vijayawada",
    to: "Hyderabad",
    distanceKm: 275,
    description: "Travel from Vijayawada to Hyderabad with verified drivers. Save up to 40% on return journey deals.",
  },
  {
    slug: "kakinada-to-rajahmundry",
    from: "Kakinada",
    to: "Rajahmundry",
    distanceKm: 65,
    description: "Intercity cab booking from Kakinada to Rajahmundry. Rural pickup points available.",
  },
  {
    slug: "rajahmundry-to-kakinada",
    from: "Rajahmundry",
    to: "Kakinada",
    distanceKm: 65,
    description: "Book cabs from Rajahmundry to Kakinada. Village pickup points across East Godavari.",
  },
  {
    slug: "hyderabad-to-visakhapatnam",
    from: "Hyderabad",
    to: "Visakhapatnam",
    distanceKm: 620,
    description: "Long-distance travel from Hyderabad to Visakhapatnam with AC vehicles and professional drivers.",
  },
  {
    slug: "hyderabad-to-tirupati",
    from: "Hyderabad",
    to: "Tirupati",
    distanceKm: 560,
    description: "Pilgrimage and leisure travel from Hyderabad to Tirupati. Book verified vehicles on Rydez India.",
  },
];

export function getSeoRoute(slug: string): SeoRoute | undefined {
  return SEO_ROUTES.find((r) => r.slug === slug);
}
