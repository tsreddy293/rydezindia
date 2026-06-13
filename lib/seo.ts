import { COMPANY } from "./data";

export const siteConfig = {
  name: COMPANY.name,
  tagline: COMPANY.tagline,
  description:
    "Rydez India is India's trusted AI-powered vehicle sharing platform. Rent self-drive and chauffeur-driven vehicles, earn from idle cars, and experience one-way journey marketplace with return trip matching.",
  url: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://rydezindia.com",
  ogImage: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&h=630&fit=crop&q=80",
  keywords: [
    "vehicle sharing India",
    "car rental India",
    "self drive rental",
    "earn from car",
    "one way car rental",
    "Rydez India",
    "peer to peer car rental",
    "intercity car sharing",
    "return journey booking",
    "Hyderabad car sharing",
  ],
};

/** Social profile placeholders — update URLs before launch marketing */
export const socialLinks = {
  facebook: "https://facebook.com/rydezindia",
  instagram: "https://instagram.com/rydezindia",
  twitter: "https://twitter.com/rydezindia",
  linkedin: "https://linkedin.com/company/rydezindia",
  youtube: "https://youtube.com/@rydezindia",
};

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: COMPANY.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    description: siteConfig.description,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: `+91-${COMPANY.phone}`,
      contactType: "customer service",
      email: COMPANY.email,
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
    sameAs: Object.values(socialLinks),
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: COMPANY.name,
    url: siteConfig.url,
    description: siteConfig.description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/search?fromCity={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
