import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/search"],
      disallow: ["/api/", "/events/", "/add-data/", "/learners/", "/sign-in/", "/login/", "/unauthorized/"]
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString()
  };
}
