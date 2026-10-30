"use client";

import Link from "next/link";
import { useProfile } from "@/lib/profile";

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[16px] font-bold tracking-tight text-paper">
      mind_bend
      <span aria-hidden className="inline-block h-[1.05em] w-[0.55em] translate-y-[1px] animate-blink bg-ember" />
    </span>
  );
}

export function Header() {
  const profile = useProfile();
  const streak = profile?.overall.streak ?? 0;
  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-void/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4">
        <Link href="/" aria-label="Mind Bend home" className="rounded-control">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-5 text-body text-fog">
          <Link href="/#games" className="hidden transition-colors duration-[var(--dur-fast)] hover:text-paper sm:inline">
            games
          </Link>
          <Link href="/#daily" className="transition-colors duration-[var(--dur-fast)] hover:text-paper">
            daily
          </Link>
          <Link
            href="/stats"
            className="inline-flex h-8 items-center gap-2 rounded-full bg-white/[0.06] px-3 font-mono text-caption text-paper shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-colors duration-[var(--dur-fast)] hover:bg-white/[0.1]"
          >
            {profile?.returning ? (
              <>
                <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${streak > 0 ? "bg-ember" : "bg-steel"}`} />
                {streak}d streak
              </>
            ) : (
              "stats"
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
