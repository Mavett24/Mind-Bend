"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { GAMES } from "@/games/registry";
import { dailyBoard, utcDateKey } from "@/engine/seed";
import type { Profile } from "@/lib/profile";
import { useToday } from "@/lib/useToday";
import { dur, ease } from "@/lib/motion";
import { GameIcon, hue } from "./GameIcon";

function formatDay(date: Date): string {
  return date
    .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .replace(",", "")
    .toLowerCase();
}

export function DailyCard({ profile }: { profile: Profile | null }) {
  const today = useToday();
  const tier = today ? dailyBoard("path", today).tier : null;
  const todayKey = today ? utcDateKey(today) : null;
  const done = new Set(todayKey && profile ? GAMES.filter((g) => profile.games[g.id].dailyDone.has(todayKey)).map((g) => g.id) : []);
  const next = GAMES.find((g) => !done.has(g.id));

  return (
    <section id="daily" aria-labelledby="daily-title" className="surface grid gap-8 rounded-card p-6 md:grid-cols-[1fr_1.1fr] md:p-8">
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-caption uppercase tracking-wide text-ash">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ember" />
          today · {today ? formatDay(today) : " "}
        </p>
        <h2 id="daily-title" className="text-display font-medium tracking-[-0.04em]">
          daily set
        </h2>
        <p className="max-w-sm text-fog">One board per game, the same for everyone today. Easy on Monday, expert on Sunday.</p>

        <div className="flex flex-col gap-2 pt-2">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-heading-lg">
              {done.size}
              <span className="text-steel">/{GAMES.length}</span>
            </span>
            <span className="text-caption uppercase text-ash">{tier ? `${tier} today` : " "}</span>
          </div>
          <div className="flex gap-1" aria-hidden>
            {GAMES.map((g, i) => (
              <motion.span
                key={g.id}
                initial={{ scaleY: 0.4, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ duration: dur.slow, ease: ease.spring, delay: 0.1 + i * 0.04 }}
                className="h-2 flex-1 rounded-full"
                style={{ background: done.has(g.id) ? hue(g.id) : "rgba(255,255,255,0.08)" }}
              />
            ))}
          </div>
        </div>

        <div className="mt-auto pt-2">
          {next ? (
            <Link
              href={`/play/${next.id}?m=daily`}
              className="group inline-flex h-11 items-center gap-2 rounded-full bg-paper px-5 font-mono text-[15px] font-medium text-void transition-colors duration-[var(--dur-fast)] hover:bg-white"
            >
              {done.size === 0 ? "start the daily set" : `continue with ${next.name}`}
              <span aria-hidden className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:translate-x-1">
                →
              </span>
            </Link>
          ) : (
            <p className="font-mono text-paper">All done for today. New set at 00:00 utc.</p>
          )}
        </div>
      </div>

      <ol className="flex flex-col">
        {GAMES.map((game, i) => (
          <motion.li
            key={game.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur.slow, ease: ease.out, delay: 0.15 + i * 0.04 }}
            className="border-b border-white/[0.06] last:border-b-0"
          >
            <Link
              href={`/play/${game.id}?m=daily`}
              className="group flex h-12 items-center gap-3 rounded-control px-2 transition-colors duration-[var(--dur-fast)] hover:bg-white/[0.04]"
            >
              <span className="w-5 text-caption text-steel">{String(i + 1).padStart(2, "0")}</span>
              <GameIcon id={game.id} size={26} />
              <span className={`flex-1 font-mono ${done.has(game.id) ? "text-ash line-through decoration-steel" : ""}`}>{game.name}</span>
              {done.has(game.id) ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-paper text-[11px] font-bold text-void" aria-label="done today">
                  ✓
                </span>
              ) : (
                <span className="h-5 w-5 rounded-full shadow-[inset_0_0_0_1.5px_var(--color-slate)]" aria-label="not played today" />
              )}
              <span aria-hidden className="text-fog transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:translate-x-1">
                →
              </span>
            </Link>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
