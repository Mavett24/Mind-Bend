"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { GameMeta } from "@/games/registry";
import { isTier, suggestTier, TIERS, TIER_LABEL, type Tier } from "@/engine/difficulty";
import { boardSeed, challengeQuery, dailyBoard, isValidSeed, randomSeed, type BoardKey, type Mode } from "@/engine/seed";
import { createRng } from "@/engine/rng";
import { dailyStreak, emptyStats, loadStats, type GameStats } from "@/engine/stats";
import { useToday } from "@/lib/useToday";
import { dur, ease } from "@/lib/motion";
import { Button } from "./Button";
import { GameIcon } from "./GameIcon";
import { Segmented } from "./Segmented";
import { TitleReveal } from "./TitleReveal";

function formatMs(ms?: number): string {
  if (!ms) return "--";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function GameStart({ game }: { game: GameMeta }) {
  const params = useSearchParams();
  const today = useToday();

  const challenge = useMemo(() => {
    const t = params.get("t");
    const s = params.get("s");
    return isTier(t) && isValidSeed(s) ? { tier: t, seed: s } : null;
  }, [params]);

  const [mode, setMode] = useState<Mode>(challenge ? "challenge" : params.get("m") === "daily" ? "daily" : "practice");
  const [stats, setStats] = useState<GameStats>(emptyStats);
  const suggested = suggestTier(stats.rating);
  const [tier, setTier] = useState<Tier>(challenge?.tier ?? "medium");
  const [board, setBoard] = useState<BoardKey | null>(null);

  useEffect(() => {
    const loaded = loadStats(game.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- stats live in localStorage, read after mount
    setStats(loaded);
    if (!challenge) setTier(suggestTier(loaded.rating));
  }, [game.id, challenge]);

  const daily = today ? dailyBoard(game.id, today) : null;
  const effectiveTier = mode === "daily" ? (daily?.tier ?? tier) : mode === "challenge" ? challenge!.tier : tier;
  const streak = today ? dailyStreak(stats.dailyDone, today.toISOString().slice(0, 10)) : 0;

  function start() {
    if (mode === "daily" && daily) setBoard(daily);
    else if (mode === "challenge" && challenge) setBoard({ gameId: game.id, ...challenge });
    else setBoard({ gameId: game.id, tier, seed: randomSeed() });
  }

  const modeOptions = [
    { value: "daily" as const, label: "daily" },
    { value: "practice" as const, label: "practice" },
    ...(challenge ? [{ value: "challenge" as const, label: "challenge" }] : []),
  ];

  return (
    <div className="flex w-full justify-center">
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: dur.slow, ease: ease.out }}
        className="flex min-h-[min(586px,calc(100dvh-104px))] w-full max-w-[440px] flex-col rounded-card border border-iron bg-carbon"
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-iron px-4 text-caption text-steel">
          <span>~/play/{game.id}</span>
          <Link href="/" aria-label="Close" className="flex h-8 w-8 items-center justify-center text-fog hover:text-paper">
            ×
          </Link>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          {board ? (
            <BoardPlaceholder key={boardSeed(board)} board={board} onBack={() => setBoard(null)} />
          ) : (
            <motion.div
              key="start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: dur.base, ease: ease.out }}
              className="flex flex-1 flex-col gap-6 p-6"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <GameIcon id={game.id} />
                  <span className="text-caption uppercase tracking-wide text-steel">{game.skill}</span>
                </div>
                <h1 className="text-number-lg font-bold">
                  <TitleReveal text={game.name} />
                </h1>
                <p className="text-heading-sm text-fog">{game.rules}</p>
              </div>

              <dl className="grid grid-cols-3 gap-4 border-y border-iron py-4">
                <Stat label="rating" value={String(stats.rating)} />
                <Stat label="best" value={formatMs(stats.bestMs[effectiveTier])} />
                <Stat label="streak" value={String(streak)} />
              </dl>

              <div className="mt-auto flex flex-col gap-3">
                <Segmented id="mode" label="Mode" options={modeOptions} value={mode} onChange={setMode} />
                <Segmented
                  id="tier"
                  label="Difficulty"
                  options={TIERS.map((t) => ({ value: t, label: TIER_LABEL[t], marked: t === suggested }))}
                  value={effectiveTier}
                  onChange={setTier}
                  disabled={mode !== "practice"}
                />
                <p className="h-5 text-caption text-steel">
                  {mode === "daily" && "today's tier is fixed. everyone plays this board."}
                  {mode === "practice" && `• suggested for your rating: ${suggested}`}
                  {mode === "challenge" && `a friend's board · seed ${challenge?.seed}`}
                </p>
                <Button onClick={start} className="w-full" disabled={mode === "daily" && !daily}>
                  play
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="truncate text-caption uppercase text-steel">{label}</dt>
      <dd className="text-heading-lg">{value}</dd>
    </div>
  );
}

/**
 * Stand-in stage until each game's generator lands (roadmap phase 2+).
 * It already runs the real seed pipeline: the same seed always paints the same grid.
 */
function BoardPlaceholder({ board, onBack }: { board: BoardKey; onBack: () => void }) {
  const size = { easy: 5, medium: 6, hard: 7, expert: 8 }[board.tier];
  const cells = useMemo(() => {
    const rng = createRng(boardSeed(board));
    return Array.from({ length: size * size }, () => rng.chance(0.18));
  }, [board, size]);
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/play/${board.gameId}?${challengeQuery(board)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      window.prompt("Copy this challenge link", url);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: dur.base, ease: ease.out }}
      className="flex flex-1 flex-col gap-6 p-6"
    >
      <div className="flex items-baseline justify-between text-caption uppercase text-steel">
        <span>{board.tier}</span>
        <span>seed {board.seed}</span>
      </div>

      <div className="grid flex-1 content-center gap-1" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {cells.map((filled, i) => {
          const row = Math.floor(i / size);
          const col = i % size;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: dur.base, ease: ease.spring, delay: (row + col) * 0.016 }}
              className={`aspect-square rounded-sm ${filled ? "bg-ember" : "bg-graphite"}`}
            />
          );
        })}
      </div>

      <p className="text-center text-fog">The board generator for this game is in build. Same seed, same grid, always.</p>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" arrow={false} onClick={onBack}>
          ← back
        </Button>
        <Button variant="ghost" arrow={false} onClick={share}>
          {copied ? "link copied ✓" : "share board"}
        </Button>
      </div>
    </motion.div>
  );
}
