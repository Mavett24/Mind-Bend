"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { GAMES, type GameMeta } from "@/games/registry";
import { MODULES } from "@/games/modules";
import { isTier, suggestTier, TIERS, TIER_LABEL, type Tier } from "@/engine/difficulty";
import { boardSeed, dailyBoard, isValidSeed, randomSeed, type BoardKey, type Mode } from "@/engine/seed";
import { dailyStreak, emptyStats, loadStats, type GameStats } from "@/engine/stats";
import { useToday } from "@/lib/useToday";
import { dur, ease } from "@/lib/motion";
import { Button } from "./Button";
import { GameIntroScreen, introSkipped } from "./GameIntro";
import { INTRO } from "@/games/intro";
import { PlaySession } from "./PlaySession";
import { PointsDisplay, TimeDisplay } from "./TimeDisplay";
import { GameIcon } from "./GameIcon";
import { Segmented } from "./Segmented";
import { TitleReveal } from "./TitleReveal";

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
  /** Board waiting behind the how-to-play screen. */
  const [pending, setPending] = useState<BoardKey | null>(null);

  useEffect(() => {
    const loaded = loadStats(game.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- stats live in localStorage, read after mount
    setStats(loaded);
    if (!challenge) setTier(suggestTier(loaded.rating));
  }, [game.id, challenge]);

  const daily = today ? dailyBoard(game.id, today) : null;
  const effectiveTier = mode === "daily" ? (daily?.tier ?? tier) : mode === "challenge" ? challenge!.tier : tier;
  const streak = today ? dailyStreak(stats.dailyDone, today.toISOString().slice(0, 10)) : 0;

  const gameModule = MODULES[game.id];
  const nextDaily = GAMES.slice(GAMES.findIndex((g) => g.id === game.id) + 1).find((g) => MODULES[g.id]);
  const nextDailyHref = nextDaily ? `/play/${nextDaily.id}?m=daily` : "/";

  function backToMenu() {
    setBoard(null);
    setStats(loadStats(game.id));
  }

  function nextBoard() {
    const nextTier = board?.tier ?? tier;
    setMode("practice");
    setTier(nextTier);
    setBoard({ gameId: game.id, tier: nextTier, seed: randomSeed() });
  }

  function start(forceIntro = false) {
    const key: BoardKey | null =
      mode === "daily" ? daily : mode === "challenge" && challenge ? { gameId: game.id, ...challenge } : { gameId: game.id, tier, seed: randomSeed() };
    if (!key) return;
    if (forceIntro || !introSkipped(game.id)) setPending(key);
    else setBoard(key);
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
          <Link href="/" aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-fog transition-colors duration-[var(--dur-fast)] hover:bg-iron hover:text-paper">
            ×
          </Link>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          {board && gameModule ? (
            <PlaySession
              key={boardSeed(board)}
              game={game}
              module={gameModule}
              board={board}
              mode={mode}
              nextDailyHref={nextDailyHref}
              onExit={backToMenu}
              onNext={nextBoard}
            />
          ) : pending ? (
            <GameIntroScreen
              key="intro"
              game={game}
              tier={pending.tier}
              mode={mode}
              onBack={() => setPending(null)}
              onStart={() => {
                setBoard(pending);
                setPending(null);
              }}
            />
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
                <h1 className="text-display font-bold">
                  <TitleReveal text={game.name} />
                </h1>
                <p className="text-heading-sm text-fog">{game.rules}</p>
              </div>

              <dl className="grid grid-cols-3 gap-4 border-y border-iron py-4">
                <Stat label="rating" value={String(stats.rating)} />
                <Stat
                  label="best"
                  value={
                    gameModule?.scoring === "points" ? (
                      stats.bestPoints[effectiveTier] !== undefined ? (
                        <PointsDisplay points={stats.bestPoints[effectiveTier]!} />
                      ) : (
                        "--"
                      )
                    ) : stats.bestMs[effectiveTier] ? (
                      <TimeDisplay ms={stats.bestMs[effectiveTier]!} />
                    ) : (
                      "--"
                    )
                  }
                />
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
                <div className="flex min-h-[44px] flex-col gap-0.5">
                  <p className="text-body text-fog">{INTRO[game.id].tiers[effectiveTier]}</p>
                  <p className="text-caption text-steel">
                    {mode === "daily" && "today's tier is fixed. everyone plays this board."}
                    {mode === "practice" && `• suggested for your rating: ${suggested}`}
                    {mode === "challenge" && `a friend's board · seed ${challenge?.seed}`}
                  </p>
                </div>
                <Button onClick={() => start()} className="w-full" disabled={mode === "daily" && !daily}>
                  play
                </Button>
                <button
                  type="button"
                  onClick={() => start(true)}
                  className="self-center text-caption text-steel underline decoration-slate underline-offset-4 hover:text-fog"
                >
                  how to play
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="truncate text-caption uppercase text-steel">{label}</dt>
      <dd className="font-mono text-heading-lg">{value}</dd>
    </div>
  );
}
