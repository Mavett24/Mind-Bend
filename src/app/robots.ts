import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Open to every crawler, AI crawlers included (GEO in the launch plan). /stats is personal, so it stays out of results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/stats" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
