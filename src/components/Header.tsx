"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useAnimate, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { useProfile } from "@/lib/profile";
import { dur, ease } from "@/lib/motion";

const SEEN_STREAK_KEY = "mind-bend:seen-streak";

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

  // The bar, blur and hairline only appear once the page has scrolled (D-052). They live on a
  // layer behind the content so the change is a fade of one element, opacity only.
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  return (
    <header className="sticky top-0 z-20">
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10 border-b border-white/[0.06] bg-void/80 backdrop-blur-md"
        initial={false}
        animate={{ opacity: scrolled ? 1 : 0 }}
        transition={{ duration: dur.base, ease: ease.out }}
      />
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
            {profile?.returning ? <Streak streak={streak} /> : "stats"}
          </Link>
        </nav>
      </div>
    </header>
  );
}

/**
 * The streak in the header bumps the first time you see it go up (D-052): the pill text springs
 * and the ember dot pulses once. The last streak shown is kept in this browser so the bump plays
 * once per new day, not on every page.
 */
function Streak({ streak }: { streak: number }) {
  const [scope, animate] = useAnimate();
  const reduced = useReducedMotion();

  useEffect(() => {
    let seen = streak;
    try {
      seen = Number(localStorage.getItem(SEEN_STREAK_KEY) ?? streak);
      localStorage.setItem(SEEN_STREAK_KEY, String(streak));
    } catch {
      return;
    }
    if (streak <= seen || streak === 0 || !scope.current) return;
    const delay = 0.4;
    if (!reduced) animate(scope.current, { scale: [1, 1.14, 1] }, { duration: dur.slow, ease: ease.springStrong, delay });
    animate("[data-dot]", { opacity: [1, 0.2, 1, 0.2, 1] }, { duration: dur.slow * 2, ease: "linear", delay });
  }, [streak, animate, reduced, scope]);

  return (
    <span ref={scope} className="inline-flex items-center gap-2">
      <span data-dot aria-hidden className={`h-1.5 w-1.5 rounded-full ${streak > 0 ? "bg-ember" : "bg-steel"}`} />
      {streak}d streak
    </span>
  );
}
