import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// Geist Sans (body) and Geist Mono (headings, numbers, labels), self-hosted via the `geist` package (SIL OFL 1.1).

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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
