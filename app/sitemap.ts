import type { MetadataRoute } from "next";

const routes = [
  { path: "/", priority: 1 },
  { path: "/search", priority: 0.9 },
  { path: "/events", priority: 0.8 },
  { path: "/add-data", priority: 0.6 }
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return routes.map((route) => ({
    url: new URL(route.path, siteUrl).toString(),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route.priority
  }));
}
