"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { GAMES } from "@/games/registry";
import { dailyBoard } from "@/engine/seed";
import { useToday } from "@/lib/useToday";
import { dur, ease } from "@/lib/motion";
import { GameIcon } from "./GameIcon";

function formatDay(date: Date): string {
  return date
    .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .replace(",", "")
    .toLowerCase();
}

export function DailyCard() {
  const today = useToday();
  const tier = today ? dailyBoard("path", today).tier : null;

  return (
    <section
      id="daily"
      aria-labelledby="daily-title"
      className="grid gap-8 rounded-card border border-iron border-l-2 border-l-ember bg-graphite p-6 md:grid-cols-[1fr_1.2fr] md:p-8"
    >
      <div className="flex flex-col gap-4">
        <p className="text-caption uppercase tracking-wide text-steel">
          today · {today ? formatDay(today) : " "}
        </p>
        <h2 id="daily-title" className="text-display font-bold">
          daily set
        </h2>
        <p className="max-w-sm text-fog">
          One board per game, the same for everyone today. Easy on Monday, expert on Sunday.
        </p>
        <div className="mt-auto flex items-end gap-6 pt-4">
          <div>
            <p className="text-caption uppercase text-steel">difficulty</p>
            <p className="text-heading-lg">{tier ?? " "}</p>
          </div>
          <div>
            <p className="text-caption uppercase text-steel">resets</p>
            <p className="text-heading-lg">00:00 utc</p>
          </div>
        </div>
      </div>

      <ol className="flex flex-col border-t border-iron md:border-t-0">
        {GAMES.map((game, i) => (
          <motion.li
            key={game.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur.slow, ease: ease.out, delay: 0.15 + i * 0.04 }}
            className="border-b border-iron"
          >
            <Link
              href={today ? `/play/${game.id}?m=daily` : `/play/${game.id}`}
              className="group flex h-12 items-center gap-3 px-1 transition-colors duration-[var(--dur-fast)] hover:bg-carbon"
            >
              <span className="w-5 text-caption text-steel">{String(i + 1).padStart(2, "0")}</span>
              <GameIcon id={game.id} size={24} />
              <span className="flex-1">{game.name}</span>
              <span className="text-caption uppercase text-steel" aria-label="not played">
                ○
              </span>
              <span
                aria-hidden
                className="text-fog transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
