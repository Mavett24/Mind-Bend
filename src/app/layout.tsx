import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted JetBrains Mono (SIL OFL 1.1, see src/fonts/OFL.txt). No runtime request to Google Fonts.
const jetbrains = localFont({
  variable: "--font-jetbrains",
  display: "swap",
  src: [
    { path: "../fonts/jetbrains-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/jetbrains-mono-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: { default: "Mind Bend", template: "%s · Mind Bend" },
  description:
    "Logic puzzles, memory games and trivia in one app, with daily challenges, infinite practice and adaptive difficulty.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jetbrains.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
