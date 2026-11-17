import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import localFont from "next/font/local";
import { MotionProvider } from "@/components/MotionProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { ConsentBanner } from "@/components/ConsentBanner";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// Geist Sans (body) and Geist Mono (headings, labels), self-hosted via the `geist` package (SIL OFL 1.1).
// Space Grotesk for standalone numbers: scores, clocks, ratings, countdowns (D-065). Variable, latin only, SIL OFL 1.1.
const spaceGrotesk = localFont({
  src: "./fonts/SpaceGrotesk-latin-variable.woff2",
  variable: "--font-space-grotesk",
  weight: "300 700",
  display: "swap",
});

const DESCRIPTION =
  "Logic puzzles, memory games, trivia and chess tactics in one app, with daily challenges, infinite practice and adaptive difficulty.";

// Link previews (D-061): the images come from the opengraph-image files, everything else from here.
// X falls back to the Open Graph image, so only the card type is set for it.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Mind Bend", template: "%s · Mind Bend" },
  description: DESCRIPTION,
  applicationName: "Mind Bend",
  authors: [{ name: "Matteo Favetta", url: "https://matteofavetta.com" }],
  openGraph: {
    type: "website",
    siteName: "Mind Bend",
    title: "Mind Bend: eight daily brain games",
    description: DESCRIPTION,
    url: "/",
    locale: "en",
  },
  twitter: { card: "summary_large_image", title: "Mind Bend: eight daily brain games", description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <MotionProvider>
          {children}
          <SiteFooter />
          <ConsentBanner />
        </MotionProvider>
      </body>
    </html>
  );
}
