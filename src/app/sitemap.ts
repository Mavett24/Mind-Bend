import type { MetadataRoute } from "next";
import { GAMES } from "@/games/registry";
import { SITE_URL } from "@/lib/site";

// Every public page. Game pages change daily (new board), the rest rarely.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    ...GAMES.map((g) => ({ url: `${SITE_URL}/play/${g.id}`, changeFrequency: "daily" as const, priority: 0.8 })),
    { url: `${SITE_URL}/credits`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
