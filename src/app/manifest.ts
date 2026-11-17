import type { MetadataRoute } from "next";

// Install metadata for phones and desktop. Icons come from scripts/build-icons.mjs (D-060).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mind Bend",
    short_name: "Mind Bend",
    description: "Logic puzzles, memory games, trivia and chess tactics, with daily challenges and adaptive difficulty.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
