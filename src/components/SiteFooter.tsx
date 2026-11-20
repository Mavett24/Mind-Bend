"use client";

import Link from "next/link";
import { dayKey } from "@/engine/history";
import { GAMES } from "@/games/registry";
import { analyticsEnabled, openConsentSettings } from "@/lib/analytics";
import { useProfile } from "@/lib/profile";
import { APP_VERSION } from "@/lib/site";
import { untilMidnightUtc, useNow } from "@/lib/useNow";
import { GameIcon, hue } from "./GameIcon";

const quiet = "transition-colors duration-[var(--dur-fast)] [@media(hover:hover)_and_(pointer:fine)]:hover:text-void";

/**
 * Site footer (D-066): today's daily set. A light band that clearly ends the page, showing what's
 * done, what's left and when the set resets, with every game one tap away. Legal links stay in
 * one small caption row (D-053).
 */
export function SiteFooter() {
  const now = useNow();
  const profile = useProfile();
  const today = profile ? dayKey(profile.now) : null;
  const done = new Set(profile && today ? GAMES.filter((g) => profile.games[g.id].dailyDone.has(today)).map((g) => g.id) : []);
  const left = GAMES.length - done.size;
  const streak = profile?.overall.streak ?? 0;

  return (
    <footer className="relative z-[1] rounded-t-card bg-paper text-void">
      <div className="mx-auto flex max-w-[1200px] flex-col px-4 pb-28 pt-10 sm:pb-6 md:pt-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 font-mono text-caption uppercase text-steel">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ember" />
              today&apos;s set
            </p>
            <h2 className="font-mono text-display font-medium" suppressHydrationWarning>
              {!profile ? (
                `${GAMES.length} games.`
              ) : left === 0 ? (
                <>
                  {GAMES.length} of {GAMES.length} done. <span className="block text-steel sm:inline">See you at midnight.</span>
                </>
              ) : (
                <>
                  {done.size} of {GAMES.length} done. <span className="block text-steel sm:inline">{left} left.</span>
                </>
              )}
            </h2>
          </div>
          <div className="flex flex-col gap-1 sm:items-end">
            <span className="font-mono text-caption uppercase text-steel">next set in</span>
            <span className="font-num text-display" suppressHydrationWarning>
              {now ? untilMidnightUtc(now) : "--:--:--"}
            </span>
          </div>
        </div>

        {/* One segment per game, in its hue once that daily is done. */}
        <div aria-hidden className="mb-3 mt-5 grid grid-cols-8 gap-1">
          {GAMES.map((g) => (
            <span key={g.id} className="h-1 rounded-full bg-void/[0.08]" style={done.has(g.id) ? { background: hue(g.id) } : undefined} />
          ))}
        </div>

        <nav aria-label="Today's games">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {GAMES.map((g) => {
              const isDone = done.has(g.id);
              return (
                <li key={g.id}>
                  <Link
                    href={`/play/${g.id}?m=daily`}
                    aria-label={`${g.name}, today's board${isDone ? ", done" : ""}`}
                    className="group flex flex-col gap-2.5 rounded-[16px] bg-white p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.06)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] active:scale-[0.97] active:duration-100 sm:gap-3.5 sm:p-3.5 [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_6px_16px_rgba(0,0,0,0.08)]"
                  >
                    <span className="flex items-center justify-between">
                      <GameIcon id={g.id} size={28} />
                      {isDone ? (
                        <span className="flex items-center gap-1.5 font-mono text-caption text-steel">
                          <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: hue(g.id) }} />
                          done
                        </span>
                      ) : (
                        <span
                          aria-hidden
                          className="font-mono text-caption text-steel opacity-0 transition-[opacity,transform] duration-200 ease-[var(--ease-out)] [@media(hover:hover)_and_(pointer:fine)]:-translate-x-1 [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100"
                        >
                          play →
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-body font-medium">{g.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-8 flex flex-col gap-3 border-t border-void/[0.08] pt-4 text-caption text-steel sm:flex-row sm:items-center sm:justify-between">
          <span>
            mind_bend v{APP_VERSION} · made in the hague by{" "}
            <a href="https://matteofavetta.com" className={`text-void/70 ${quiet}`}>
              matteo favetta
            </a>
            {streak > 0 && <span suppressHydrationWarning> · {streak} day streak</span>}
          </span>
          <nav aria-label="Legal" className="flex gap-5">
            <Link href="/privacy" className={quiet}>
              privacy
            </Link>
            <Link href="/credits" className={quiet}>
              credits
            </Link>
            {analyticsEnabled && (
              <button type="button" onClick={openConsentSettings} className={quiet}>
                cookie settings
              </button>
            )}
          </nav>
        </div>
      </div>
    </footer>
  );
}
