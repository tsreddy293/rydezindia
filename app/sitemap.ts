import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo";

/** Public routes included in sitemap — admin and auth flows excluded */
const PUBLIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"] }[] = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/search", priority: 0.9, changeFrequency: "daily" },
  { path: "/owner", priority: 0.9, changeFrequency: "weekly" },
  { path: "/vehicles/add", priority: 0.8, changeFrequency: "weekly" },
  { path: "/contact", priority: 0.8, changeFrequency: "monthly" },
  { path: "/investors", priority: 0.7, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.5, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.5, changeFrequency: "yearly" },
  { path: "/refund", priority: 0.5, changeFrequency: "yearly" },
  { path: "/owner-agreement", priority: 0.5, changeFrequency: "yearly" },
  { path: "/user-agreement", priority: 0.5, changeFrequency: "yearly" },
  { path: "/owner/register", priority: 0.7, changeFrequency: "monthly" },
  { path: "/user/register", priority: 0.7, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${siteConfig.url}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
