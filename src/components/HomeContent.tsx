"use client";

import Link from "next/link";
import { GAMES } from "@/games/registry";
import { activity, levelProgress } from "@/engine/history";
import { useProfile, type Profile } from "@/lib/profile";
import { Reveal } from "./Reveal";
import { Hero } from "./Hero";
import { GameTile } from "./GameTile";
import { GameIcon, gameColours } from "./GameIcon";
import { ActivityBars, TierBar } from "./charts";

export function HomeContent() {
  const profile = useProfile();

  return (
    <>
      <Hero profile={profile} />
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-10 px-4 pb-16 md:gap-14">
        <Reveal>
          <YouCard profile={profile} />
        </Reveal>

        <section id="games" aria-labelledby="games-title" className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between">
            <h2 id="games-title" className="title-card">
              games
            </h2>
            <p className="text-caption uppercase text-steel">{GAMES.length} games · 4 tiers</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GAMES.map((game, i) => (
              <Reveal
                key={game.id}
                // Bento on wide screens: the first card spans two columns so eight cards fill three rows.
                className={i === 0 ? "lg:col-span-2" : ""}
              >
                <GameTile game={game} summary={profile?.games[game.id] ?? null} />
              </Reveal>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function YouCard({ profile }: { profile: Profile | null }) {
  const f = profile?.focus;
  const game = f ? GAMES.find((g) => g.id === f.gameId) : null;
  const summary = game && profile ? profile.games[game.id] : null;
  const tp = summary && game ? levelProgress(game.id, summary.rating) : null;
  const days = profile ? activity(profile.data, profile.now, 14) : null;

  // The card picks up the next game's colour from the right, where its panel sits (D-075).
  return (
    <section
      aria-labelledby="you-title"
      style={game ? gameColours(game.id) : undefined}
      className={`surface relative grid gap-6 overflow-hidden rounded-card p-6 md:p-8 lg:grid-cols-[1.1fr_1fr_1.1fr] lg:items-stretch lg:gap-8 ${game ? "you-tint" : ""}`}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-baseline justify-between">
          <h2 id="you-title" className="title-card">
            you
          </h2>
          <Link href="/stats" className="text-caption text-fog underline decoration-slate underline-offset-4 hover:text-paper">
            all stats →
          </Link>
        </div>

        <dl className="grid grid-cols-3 gap-2">
          <Stat label="streak" value={profile ? `${profile.overall.streak}d` : "--"} accent={!!profile && profile.overall.streak > 0} />
          <Stat label="played" value={profile ? String(profile.overall.games) : "--"} />
          <Stat label="best run" value={profile ? `${profile.overall.longestStreak}d` : "--"} />
        </dl>
      </div>

      <div className="flex flex-col justify-end gap-2">
        <p className="text-caption uppercase text-ash">last 14 days</p>
        {days ? <ActivityBars days={days} /> : <div className="h-10" />}
      </div>

      {game && f && tp && (
        <Link
          href={`/play/${game.id}`}
          className="game-surface group relative flex flex-col gap-3 rounded-[18px] p-4 transition-transform duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <span className="rounded-[11px] shadow-[0_0_0_1px_rgba(0,0,0,0.28),0_4px_12px_rgba(0,0,0,0.25)]">
              <GameIcon id={game.id} size={36} />
            </span>
            <div className="flex flex-1 flex-col">
              <span className="on-colour-soft text-caption uppercase">next up</span>
              <span className="font-mono text-heading-sm text-white">{game.name}</span>
            </div>
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-full bg-paper text-void transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:translate-x-0.5"
            >
              →
            </span>
          </div>
          <p className="on-colour-soft">{f.reason}</p>
          {tp.caption && (
            <div className="flex flex-col gap-1.5">
              <TierBar progress={tp.progress} color="var(--color-paper)" />
              <span className="on-colour-soft font-mono text-caption">
                {summary!.rating} · {tp.caption}
              </span>
            </div>
          )}
        </Link>
      )}
    </section>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="well flex flex-col gap-1 rounded-[14px] px-3 py-2.5">
      <dt className="text-caption uppercase text-ash">{label}</dt>
      {/* A live streak is the one number in ember, the streak colour everywhere else (DESIGN.md). */}
      <dd className={`font-num text-heading-lg ${accent ? "text-ember" : ""}`}>{value}</dd>
    </div>
  );
}
