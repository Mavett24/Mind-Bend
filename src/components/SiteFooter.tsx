"use client";

import Link from "next/link";
import { GAMES } from "@/games/registry";
import { analyticsEnabled, openConsentSettings } from "@/lib/analytics";
import { untilMidnightUtc, useNow } from "@/lib/useNow";
import { GameIcon, hue } from "./GameIcon";

const quiet = "transition-colors duration-[var(--dur-fast)] hover:text-paper";

/**
 * Site footer (DESIGN.md §5): the sign-off. A two-tone slogan like the hero headline, the
 * countdown to the next daily set, every game as a hue tile, a giant wordmark sinking into
 * the page edge, and the legal links kept to one small caption row (D-053).
 */
export function SiteFooter() {
  const now = useNow();

  return (
    <footer className="relative overflow-hidden border-t border-iron">
      <div className="relative z-10 mx-auto flex max-w-[1200px] flex-col gap-12 px-4 pb-6 pt-14 md:gap-14 md:pt-20">
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4">
            <p className="font-mono text-caption text-steel">
              ~/mind-bend $ sign-off
              <span aria-hidden className="ml-1 inline-block h-[1.1em] w-[0.55em] translate-y-[2px] animate-blink bg-ember" />
            </p>
            <h2 className="text-display text-paper md:text-number">
              Built to
              <br />
              <span className="text-steel">bend minds.</span>
            </h2>
            <p className="max-w-[420px] text-fog">
              Logic, memory, trivia and chess. A fresh set every midnight, and endless boards in between that keep up with you.
            </p>
          </div>

          <Link
            href="/#daily"
            className="surface group flex w-full shrink-0 flex-col gap-3 rounded-card p-5 transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] hover:-translate-y-1 md:w-[280px]"
          >
            <span className="flex items-center gap-2 text-caption uppercase text-ash">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ember" />
              next set in
            </span>
            <span className="font-mono text-heading-lg tabular-nums text-paper" suppressHydrationWarning>
              {now ? untilMidnightUtc(now) : "--:--:--"}
            </span>
            <span className="flex items-center justify-between font-mono text-body text-fog transition-colors duration-[var(--dur-fast)] group-hover:text-paper">
              play today&apos;s set
              <span aria-hidden className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:translate-x-1">
                →
              </span>
            </span>
          </Link>
        </div>

        <nav aria-label="Games">
          <ul className="grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-8">
            {GAMES.map((g) => (
              <li key={g.id}>
                <Link href={`/play/${g.id}`} className="group flex flex-col items-center gap-2 rounded-control py-1" aria-label={`play ${g.name}`}>
                  <span className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:-translate-y-1 group-hover:-rotate-6">
                    <GameIcon id={g.id} size={40} />
                  </span>
                  <span className="font-mono text-caption text-ash transition-colors duration-[var(--dur-fast)] group-hover:text-[var(--h)]" style={{ "--h": hue(g.id) } as React.CSSProperties}>
                    {g.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-3 border-t border-iron pt-5 text-caption text-steel sm:flex-row sm:items-center sm:justify-between">
          <span>
            mind_bend v0.7 · made in the hague by{" "}
            <a href="https://matteofavetta.com" className={`text-ash ${quiet}`}>
              matteo favetta
            </a>
          </span>
          <nav aria-label="Legal" className="flex gap-5 text-ash">
            <Link href="/privacy" className={quiet}>
              privacy
            </Link>
            {analyticsEnabled && (
              <button type="button" onClick={openConsentSettings} className={quiet}>
                cookie settings
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* The wordmark, huge and sinking into the bottom edge. Decoration only. */}
      <div aria-hidden className="pointer-events-none select-none px-4">
        <div className="mx-auto -mb-[0.1em] max-w-[1200px] font-display whitespace-nowrap leading-none text-graphite"
          style={{ fontSize: "var(--text-footer-mark)" }}
        >
          mind_bend
          <span className="ml-[0.04em] inline-block h-[0.62em] w-[0.5em] bg-ember-wash" />
        </div>
      </div>
    </footer>
  );
}
