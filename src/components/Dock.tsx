"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dayKey } from "@/engine/history";
import { GAMES } from "@/games/registry";
import { useProfile } from "@/lib/profile";
import { GameIcon } from "./GameIcon";

/**
 * Floating dock (D-068), phones only: today (with the daily set as a ring), games, stats, and a
 * white pill to the next unplayed daily. Hidden while a board is in play (`useHideDock`).
 *
 * Alignment: every tab is the same 52px-tall column with a 20px glyph box and an 11px label on a
 * 12px line, so icons and labels share one centre line and one baseline across the dock. The pill is
 * the same 52px tall and sits on the same centre line.
 */
export function Dock() {
  const pathname = usePathname();
  const profile = useProfile();
  const today = profile ? dayKey(profile.now) : null;
  const doneIds = new Set(profile && today ? GAMES.filter((g) => profile.games[g.id].dailyDone.has(today)).map((g) => g.id) : []);
  const next = profile ? (GAMES.find((g) => !doneIds.has(g.id)) ?? null) : GAMES[0];
  const active = pathname === "/" ? "today" : pathname.startsWith("/stats") ? "stats" : pathname.startsWith("/play") ? "games" : null;

  return (
    <nav aria-label="Main" className="dock fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 mx-auto max-w-[440px] sm:hidden">
      <div className="grid h-16 grid-cols-[1fr_1fr_1fr_auto] items-center gap-1 rounded-full bg-[linear-gradient(var(--color-surface-top),var(--color-surface-bottom))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(255,255,255,0.05),0_12px_32px_rgba(0,0,0,0.6)]">
        <Tab href="/" label="today" on={active === "today"}>
          <Ring done={doneIds.size} total={GAMES.length} />
        </Tab>
        <Tab href="/#games" label="games" on={active === "games"}>
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden>
            <g fill="currentColor">
              <rect x="3" y="3" width="6" height="6" rx="1.6" />
              <rect x="11" y="3" width="6" height="6" rx="1.6" />
              <rect x="3" y="11" width="6" height="6" rx="1.6" />
              <rect x="11" y="11" width="6" height="6" rx="1.6" opacity="0.45" />
            </g>
          </svg>
        </Tab>
        <Tab href="/stats" label="stats" on={active === "stats"}>
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden>
            <g fill="currentColor">
              <rect x="3" y="10" width="3.2" height="7" rx="1" />
              <rect x="8.4" y="6" width="3.2" height="11" rx="1" />
              <rect x="13.8" y="3" width="3.2" height="14" rx="1" />
            </g>
          </svg>
        </Tab>

        {next ? (
          <Link
            href={`/play/${next.id}?m=daily`}
            aria-label={`Play today's ${next.name}`}
            className="flex h-[52px] items-center gap-2.5 whitespace-nowrap rounded-full bg-paper pl-2 pr-4 text-void transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.96]"
            suppressHydrationWarning
          >
            <GameIcon id={next.id} size={36} />
            <span className="flex flex-col justify-center font-mono">
              <span className="text-[10px] leading-3 text-steel">next</span>
              <span className="text-[13px] font-medium leading-4">{next.name} →</span>
            </span>
          </Link>
        ) : (
          <Link
            href="/#games"
            className="flex h-[52px] items-center whitespace-nowrap rounded-full bg-paper px-5 font-mono text-[13px] font-medium leading-4 text-void transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.96]"
          >
            practice →
          </Link>
        )}
      </div>
    </nav>
  );
}

function Tab({ href, label, on, children }: { href: string; label: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`flex h-[52px] flex-col items-center justify-center gap-1 rounded-full font-mono text-[11px] font-medium leading-3 transition-[transform,color,background-color] duration-150 ease-[var(--ease-out)] active:scale-[0.96] ${
        on ? "bg-white/[0.07] text-paper" : "text-ash"
      }`}
    >
      <span className="flex h-5 w-5 items-center justify-center">{children}</span>
      {label}
    </Link>
  );
}

/** The daily set as a ring: ember arc for games done, the count in the middle. */
function Ring({ done, total }: { done: number; total: number }) {
  const r = 8.5;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative flex h-5 w-5 items-center justify-center" suppressHydrationWarning>
      <svg viewBox="0 0 20 20" width="20" height="20" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="10" cy="10" r={r} fill="none" stroke="var(--color-slate)" strokeWidth="1.8" />
        {done > 0 && (
          <circle cx="10" cy="10" r={r} fill="none" stroke="var(--color-ember)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray={`${(done / total) * c} ${c}`} />
        )}
      </svg>
      <span className="font-num text-[9px] font-semibold leading-none text-paper">{done}</span>
    </span>
  );
}
