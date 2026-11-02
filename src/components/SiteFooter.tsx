"use client";

import Link from "next/link";
import { analyticsEnabled, openConsentSettings } from "@/lib/analytics";

const linkClass = "transition-colors duration-[var(--dur-fast)] hover:text-paper";

/** Site-wide footer: version, credits, privacy and the way back into the cookie choice (D-053). */
export function SiteFooter() {
  return (
    <footer className="border-t border-iron">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-6 text-caption text-steel md:flex-row md:items-center md:justify-between">
        <span>mind_bend · v0.7</span>
        <span>Inspired by LinkedIn Games, Dialed and Lessgames. Everything here is original.</span>
        <nav aria-label="Legal" className="flex gap-5 text-ash">
          <Link href="/privacy" className={linkClass}>
            privacy
          </Link>
          {analyticsEnabled && (
            <button type="button" onClick={openConsentSettings} className={linkClass}>
              cookie settings
            </button>
          )}
        </nav>
      </div>
    </footer>
  );
}
