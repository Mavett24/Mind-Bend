"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { GAMES, type GameId } from "@/games/registry";
import { TIERS } from "@/engine/difficulty";
import { activity, exportCode, importCode, levelLabel, PUZZLE_RATED, puzzleBests, tierProgress, type GameRecord, type Skill } from "@/engine/history";
import { getHistory, importHistory, resetHistory } from "@/lib/history";
import { scoringOf, useProfile, type Profile } from "@/lib/profile";
import { dur, ease } from "@/lib/motion";
import { GameIcon, hue } from "./GameIcon";
import { ActivityCalendar, RatingChart, Sparkline, TierBar } from "./charts";
import { CountUpStat, PointsDisplay, TimeDisplay } from "./TimeDisplay";
import { Reveal } from "./Reveal";
import { Button } from "./Button";
import { parseRushSeed } from "@/games/chess/rush";

const SKILL_LABEL: Record<Skill, { name: string; games: string }> = {
  logic: { name: "logic", games: "path, balance, blocks, sudoku" },
  words: { name: "words", games: "weave" },
  memory: { name: "memory", games: "recall" },
  knowledge: { name: "knowledge", games: "trivia" },
  tactics: { name: "tactics", games: "chess · puzzle rating" },
};

function fmtDuration(ms: number) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmtWhen(at: number, now: number) {
  const d = Math.floor((now - at) / 86_400_000);
  if (d <= 0) {
    const h = Math.floor((now - at) / 3_600_000);
    return h <= 0 ? "just now" : `${h}h ago`;
  }
  return d === 1 ? "yesterday" : `${d}d ago`;
}

export function StatsContent() {
  const profile = useProfile();
  if (!profile) return <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-14" />;
  if (!profile.returning) return <Empty />;
  return <Stats profile={profile} />;
}

function Empty() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 pb-16 pt-10 md:pt-14">
      <h1 className="title-card md:text-[38px]">your stats</h1>
      <div className="surface flex flex-col items-start gap-4 rounded-card p-6 md:p-8">
        <p className="max-w-md text-fog">
          Nothing here yet. Every game you play is saved in this browser: ratings, bests, streaks and a calendar of the days you trained.
        </p>
        <Link href="/play/path?m=daily" className="inline-flex h-11 items-center gap-2 rounded-full bg-paper px-5 font-mono font-medium text-void hover:bg-white">
          start today&apos;s daily set →
        </Link>
      </div>
      <DataCard />
    </main>
  );
}

function Stats({ profile }: { profile: Profile }) {
  const firstAt = profile.data.records[0]?.at ?? profile.now;
  const played = GAMES.filter((g) => profile.games[g.id].played > 0);
  const [selected, setSelected] = useState<GameId>(() => [...played].sort((a, b) => profile.games[b.id].played - profile.games[a.id].played)[0]?.id ?? "path");
  const o = profile.overall;
  const days = useMemo(() => activity(profile.data, profile.now, 26 * 7), [profile]);

  // Each total counts up from zero (D-052). `format` takes the in-between value, so it rounds.
  const totals: { label: string; value: number; format: (v: number) => string }[] = [
    { label: "games", value: o.games, format: (v) => String(Math.round(v)) },
    { label: "solved", value: o.games ? (o.solved / o.games) * 100 : 0, format: (v) => (o.games ? `${Math.round(v)}%` : "--") },
    { label: "time played", value: o.timeMs, format: fmtDuration },
    { label: "streak", value: o.streak, format: (v) => `${Math.round(v)}d` },
    { label: "longest", value: o.longestStreak, format: (v) => `${Math.round(v)}d` },
  ];

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-4 px-4 pb-16 pt-8 md:gap-5 md:pt-14">
      <div className="flex flex-col gap-1 pb-3">
        <p className="text-caption text-steel">~/mind-bend $ stats</p>
        <h1 className="text-heading-lg font-medium md:text-[38px] md:leading-[1.15] md:tracking-[-0.03em]">your stats</h1>
        <p className="text-fog">
          Since {new Date(firstAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}. Saved in this browser.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {totals.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur.slow, ease: ease.out, delay: i * 0.04 }}
            className={`surface flex flex-col gap-1 rounded-[20px] px-5 py-4 ${i === 4 ? "col-span-2 md:col-span-1" : ""}`}
          >
            <dt className="text-caption uppercase text-ash">{t.label}</dt>
            <dd className="font-num text-heading-lg">
              <CountUpStat value={t.value} format={t.format} />
            </dd>
          </motion.div>
        ))}
      </dl>

      <div className="grid gap-4 md:gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Reveal as="section" className="surface flex flex-col gap-4 rounded-card p-6 md:p-8" aria-labelledby="cal-title">
          <div className="flex items-baseline justify-between">
            <h2 id="cal-title" className="title-card">
              training days
            </h2>
            <span className="text-caption text-ash">last 26 weeks</span>
          </div>
          <ActivityCalendar days={days} />
        </Reveal>

        <Reveal as="section" className="surface flex flex-col gap-4 rounded-card p-6 md:p-8" aria-labelledby="skills-title">
          <h2 id="skills-title" className="title-card">
            skills
          </h2>
          <ul className="flex flex-col gap-4">
            {profile.skills.map((s) => {
              const tp = tierProgress(s.rating);
              // Tactics is a puzzle rating (400 to 2800); the rest share the 600 to 2000 game scale.
              const puzzle = s.skill === "tactics";
              const [lo, span] = puzzle ? [400, 2400] : [600, 1400];
              return (
                <li key={s.skill} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono">{SKILL_LABEL[s.skill].name}</span>
                    <span className="font-mono text-caption text-ash">{s.played ? (puzzle ? `${s.rating}` : `${s.rating} · ${tp.current}`) : "not played"}</span>
                  </div>
                  <TierBar progress={s.played ? Math.min(1, Math.max(0.02, (s.rating - lo) / span)) : 0} />
                  <span className="text-caption text-steel">{SKILL_LABEL[s.skill].games}</span>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>

      <Reveal as="section" className="surface flex flex-col gap-5 rounded-card p-6 md:p-8" aria-labelledby="games-stats-title">
        <div className="flex flex-col gap-1">
          <h2 id="games-stats-title" className="title-card">
            by game
          </h2>
          <p className="text-fog">Pick a game to see its rating over time. The grey lines mark the rating where each tier becomes your suggestion.</p>
        </div>

        <div className="-mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[520px] border-separate border-spacing-y-1 text-left">
            <thead className="text-caption uppercase text-steel">
              <tr>
                <th className="px-3 py-1 font-normal">game</th>
                <th className="px-3 py-1 font-normal">rating</th>
                <th className="px-3 py-1 font-normal">trend</th>
                <th className="px-3 py-1 font-normal">tier</th>
                <th className="px-3 py-1 text-right font-normal">played</th>
              </tr>
            </thead>
            <tbody>
              {GAMES.map((g) => {
                const s = profile.games[g.id];
                const on = g.id === selected;
                return (
                  <tr
                    key={g.id}
                    onClick={() => setSelected(g.id)}
                    className={`cursor-pointer transition-colors duration-[var(--dur-fast)] ${on ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"}`}
                  >
                    <td className="rounded-l-[12px] px-3 py-2">
                      <button type="button" aria-pressed={on} className="flex items-center gap-3 font-mono" onClick={() => setSelected(g.id)}>
                        <GameIcon id={g.id} size={28} />
                        {g.name}
                      </button>
                    </td>
                    <td className="px-3 py-2 font-mono">{s.played ? s.rating : "--"}</td>
                    <td className="px-3 py-2">
                      <Sparkline points={s.ratingSeries.slice(-20).map((p) => p.rating)} color={hue(g.id)} width={96} height={24} />
                    </td>
                    <td className="px-3 py-2 font-mono text-fog">{s.played ? levelLabel(s) : "--"}</td>
                    <td className="rounded-r-[12px] px-3 py-2 text-right font-mono text-fog">{s.played}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <GameDetail profile={profile} id={selected} />
      </Reveal>

      <RecentCard profile={profile} />
      <DataCard />
    </main>
  );
}

function GameDetail({ profile, id }: { profile: Profile; id: GameId }) {
  const s = profile.games[id];
  const game = GAMES.find((g) => g.id === id)!;
  const scored = scoringOf(id) === "points";
  return (
    <div className="grid gap-5 border-t border-white/[0.06] pt-5 lg:grid-cols-[1.6fr_1fr]">
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 font-mono">
          <GameIcon id={id} size={22} />
          {game.name} rating
        </p>
        {s.ratingSeries.length > 1 ? (
          <RatingChart series={s.ratingSeries} color={hue(id)} label={game.name} tiers={!PUZZLE_RATED.has(id)} />
        ) : (
          <p className="py-10 text-center text-fog">Play a practice board of {game.name} to start its rating line.</p>
        )}
      </div>
      <div className="flex flex-col gap-4">
        {PUZZLE_RATED.has(id) ? (
          <PuzzleBestsBlock profile={profile} id={id} />
        ) : (
          <div>
            <p className="pb-2 text-caption uppercase text-ash">{scored ? "best score per tier" : "fastest per tier"}</p>
            <dl className="grid grid-cols-2 gap-2">
              {TIERS.map((t) => (
                <div key={t} className="well flex flex-col gap-0.5 rounded-[14px] px-3 py-2.5">
                  <dt className="text-caption text-ash">
                    {t} · {s.solvesByTier[t] ?? 0}
                  </dt>
                  <dd className="font-mono text-heading-sm">
                    {s.best[t] === undefined ? "--" : scored ? <PointsDisplay points={s.best[t]!} /> : <TimeDisplay ms={s.best[t]!} />}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        <dl className="grid grid-cols-3 gap-2 font-mono">
          <div>
            <dt className="text-caption text-ash">solved</dt>
            <dd>{s.played ? `${Math.round((s.solved / s.played) * 100)}%` : "--"}</dd>
          </div>
          <div>
            <dt className="text-caption text-ash">quits</dt>
            <dd>{s.quits}</dd>
          </div>
          <div>
            <dt className="text-caption text-ash">hints</dt>
            <dd>{s.hints}</dd>
          </div>
        </dl>
        <Link
          href={`/play/${id}`}
          className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-full bg-paper px-5 font-mono font-medium text-void hover:bg-white"
        >
          play {game.name} →
        </Link>
      </div>
    </div>
  );
}

function PuzzleBestsBlock({ profile, id }: { profile: Profile; id: GameId }) {
  const b = puzzleBests(profile.data, id);
  const cells: [string, React.ReactNode][] = [
    ["peak rating", b.peak],
    ["hardest solved", b.hardest ?? "--"],
    ["best run", b.bestRun ? `${b.bestRun} in a row` : "--"],
    ["fastest clean", b.fastestMs === null ? "--" : <TimeDisplay ms={b.fastestMs} />],
  ];
  return (
    <div>
      <p className="pb-2 text-caption uppercase text-ash">bests</p>
      <dl className="grid grid-cols-2 gap-2">
        {cells.map(([label, value]) => (
          <div key={label} className="well flex flex-col gap-0.5 rounded-[14px] px-3 py-2.5">
            <dt className="text-caption text-ash">{label}</dt>
            <dd className="font-mono text-heading-sm">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function RecentCard({ profile }: { profile: Profile }) {
  const recent = [...profile.data.records].sort((a, b) => b.at - a.at).slice(0, 12);
  return (
    <Reveal as="section" className="surface flex flex-col gap-4 rounded-card p-6 md:p-8" aria-labelledby="recent-title">
      <h2 id="recent-title" className="title-card">
        recent
      </h2>
      <ol className="flex flex-col">
        {recent.map((r) => (
          <RecentRow key={r.id} r={r} delta={profile.games[r.gameId as GameId]?.deltas.get(r.id)} now={profile.now} />
        ))}
      </ol>
    </Reveal>
  );
}

function RecentRow({ r, delta, now }: { r: GameRecord; delta: number | undefined; now: number }) {
  const game = GAMES.find((g) => g.id === r.gameId);
  if (!game) return null;
  return (
    <li className="flex items-center gap-3 border-b border-white/[0.06] py-2.5 last:border-b-0">
      <GameIcon id={game.id} size={28} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-mono">{game.name}</span>
        <span className="truncate text-caption text-ash">
          {r.mode === "rush" ? `puzzle rush · ${parseRushSeed(r.seed)?.minutes ?? "?"} min` : `${r.opponent !== undefined ? `puzzle ${r.opponent}` : r.tier} · ${r.mode}`} · {fmtWhen(r.at, now)}
        </span>
      </div>
      <span className="font-mono">
        {r.quit ? <span className="text-ash">left</span> : r.mode === "rush" ? `${r.score ?? 0} solved` : r.points !== undefined ? <PointsDisplay points={r.points} /> : <TimeDisplay ms={r.timeMs} />}
      </span>
      <span className="w-12 text-right font-mono text-caption text-ash">{delta === undefined ? "" : `${delta >= 0 ? "+" : ""}${delta}`}</span>
    </li>
  );
}

function DataCard() {
  const [code, setCode] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  async function makeCode() {
    const c = exportCode(getHistory());
    setCode(c);
    try {
      await navigator.clipboard.writeText(c);
      setMsg("Code copied. Paste it on your other device, on this page.");
    } catch {
      setMsg("Select the code and copy it.");
    }
  }

  function doImport() {
    const data = importCode(paste);
    if (!data) return setMsg("That code isn't valid. Copy the whole thing, starting with MB2:");
    const added = importHistory(data);
    setPaste("");
    setMsg(added ? `Added ${added} ${added === 1 ? "game" : "games"}. Ratings and streaks are recalculated.` : "Nothing new: those games are already here.");
  }

  return (
    <Reveal as="section" className="surface flex flex-col gap-4 rounded-card p-6 md:p-8" aria-labelledby="data-title">
      <div className="flex flex-col gap-1">
        <h2 id="data-title" className="title-card">
          your data
        </h2>
        <p className="max-w-xl text-fog">
          Your history lives in this browser only, no account needed. To move it, copy a transfer code here and paste it on the other device. Games
          from both are merged, never overwritten.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Button variant="ghost" arrow={false} onClick={makeCode}>
            copy transfer code
          </Button>
          {code && (
            <textarea readOnly value={code} rows={3} onFocus={(e) => e.currentTarget.select()} className="well w-full resize-none rounded-[14px] p-3 font-mono text-caption text-fog" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={2}
            placeholder="paste a transfer code"
            aria-label="Transfer code"
            className="well w-full resize-none rounded-[14px] p-3 font-mono text-caption text-paper placeholder:text-steel"
          />
          <Button variant="ghost" arrow={false} onClick={doImport} disabled={!paste.trim()}>
            add games from code
          </Button>
        </div>
      </div>
      {msg && <p className="font-mono text-caption text-chalk">{msg}</p>}
      <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
        {confirmReset ? (
          <>
            <span className="text-fog">Delete every game on this device?</span>
            <button
              type="button"
              className="rounded-full bg-ember px-4 py-1.5 font-mono text-caption font-medium text-void"
              onClick={() => {
                resetHistory();
                setConfirmReset(false);
                setMsg("History cleared.");
              }}
            >
              yes, delete
            </button>
            <button type="button" className="font-mono text-caption text-fog underline underline-offset-4" onClick={() => setConfirmReset(false)}>
              keep it
            </button>
          </>
        ) : (
          <button type="button" className="font-mono text-caption text-steel underline decoration-slate underline-offset-4 hover:text-fog" onClick={() => setConfirmReset(true)}>
            reset history
          </button>
        )}
      </div>
    </Reveal>
  );
}
