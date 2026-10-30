"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { GAMES } from "@/games/registry";
import { activity, tierProgress } from "@/engine/history";
import { useProfile, type Profile } from "@/lib/profile";
import { dur, ease } from "@/lib/motion";
import { DailyCard } from "./DailyCard";
import { GameTile } from "./GameTile";
import { GameIcon } from "./GameIcon";
import { ActivityBars, TierBar } from "./charts";

export function HomeContent() {
  const profile = useProfile();
  const returning = profile?.returning ?? false;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 pb-16 pt-8 md:gap-12 md:pt-14">
      <section className="flex min-h-[132px] flex-col gap-3">
        <p className="text-caption text-steel">~/mind-bend $ {returning ? "welcome back" : "train"}</p>
        <h1 className="max-w-3xl text-heading-lg font-medium tracking-[-0.04em] md:text-[38px] md:leading-[1.15]">
          {returning ? (
            <>
              {greeting(profile!)}
              <br />
              <span className="text-ash">{subline(profile!)}</span>
            </>
          ) : (
            <>
              Train the way you think.
              <br />
              <span className="text-ash">Never the same board twice.</span>
            </>
          )}
        </h1>
        {!returning && (
          <p className="max-w-xl text-fog">
            Seven games for logic, memory and knowledge. A daily set for everyone, infinite practice for you, and a rating per game that picks
            your difficulty. Your scores stay in this browser.
          </p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <DailyCard profile={profile} />
        <YouCard profile={profile} />
      </div>

      <section id="games" aria-labelledby="games-title" className="flex flex-col gap-5">
        <div className="flex items-baseline justify-between">
          <h2 id="games-title" className="title-card">
            games
          </h2>
          <p className="text-caption uppercase tracking-wide text-steel">{GAMES.length} games · 4 tiers</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game, i) => (
            <motion.div
              key={game.id}
              // Bento on wide screens: the first and last cards span two columns so seven cards fill three rows.
              className={i === 0 || i === GAMES.length - 1 ? "lg:col-span-2" : ""}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur.slow, ease: ease.out, delay: 0.05 * i }}
            >
              <GameTile game={game} summary={profile?.games[game.id] ?? null} />
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}

function greeting(p: Profile) {
  const s = p.overall.streak;
  if (s >= 2) return `Day ${s} of your streak.`;
  if (p.overall.today > 0) return "Back for more.";
  return "Welcome back.";
}

function subline(p: Profile) {
  if (p.overall.today === 0) return p.overall.streak >= 1 ? "Play one game today to keep it going." : "Pick up where you left off.";
  return `${p.overall.today} ${p.overall.today === 1 ? "game" : "games"} today.`;
}

function YouCard({ profile }: { profile: Profile | null }) {
  const f = profile?.focus;
  const game = f ? GAMES.find((g) => g.id === f.gameId) : null;
  const summary = game && profile ? profile.games[game.id] : null;
  const tp = summary ? tierProgress(summary.rating) : null;
  const days = profile ? activity(profile.data, profile.now, 14) : null;

  return (
    <section aria-labelledby="you-title" className="surface flex flex-col gap-6 rounded-card p-6 md:p-8">
      <div className="flex items-baseline justify-between">
        <h2 id="you-title" className="title-card">
          you
        </h2>
        <Link href="/stats" className="text-caption text-fog underline decoration-slate underline-offset-4 hover:text-paper">
          all stats →
        </Link>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        <Stat label="streak" value={profile ? `${profile.overall.streak}d` : "--"} />
        <Stat label="played" value={profile ? String(profile.overall.games) : "--"} />
        <Stat label="best run" value={profile ? `${profile.overall.longestStreak}d` : "--"} />
      </dl>

      <div className="flex flex-col gap-2">
        <p className="text-caption uppercase text-ash">last 14 days</p>
        {days ? <ActivityBars days={days} /> : <div className="h-10" />}
      </div>

      {game && f && tp && (
        <Link
          href={`/play/${game.id}`}
          className="well group mt-auto flex flex-col gap-3 rounded-[18px] p-4 transition-colors duration-[var(--dur-fast)] hover:bg-white/[0.06]"
        >
          <div className="flex items-center gap-3">
            <GameIcon id={game.id} size={36} />
            <div className="flex flex-1 flex-col">
              <span className="text-caption uppercase text-ash">next up</span>
              <span className="font-mono text-heading-sm">{game.name}</span>
            </div>
            <span aria-hidden className="text-fog transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:translate-x-1">
              →
            </span>
          </div>
          <p className="text-fog">{f.reason}</p>
          {tp.next && (
            <div className="flex flex-col gap-1.5">
              <TierBar progress={tp.progress} color={`var(--color-hue-${game.id})`} />
              <span className="font-mono text-caption text-ash">
                {summary!.rating} · {tp.nextAt! - summary!.rating} to {tp.next}
              </span>
            </div>
          )}
        </Link>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="well flex flex-col gap-1 rounded-[14px] px-3 py-2.5">
      <dt className="text-caption uppercase text-ash">{label}</dt>
      <dd className="font-mono text-heading-lg">{value}</dd>
    </div>
  );
}
