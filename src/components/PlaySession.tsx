"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GameMeta } from "@/games/registry";
import type { GameModule, SolveDetail } from "@/games/types";
import { boardSeed, challengeQuery, utcDateKey, type BoardKey, type Mode } from "@/engine/seed";
import { createRng } from "@/engine/rng";
import { applyResult, dailyStreak, loadStats, saveStats, type ResultSummary } from "@/engine/stats";
import { dur, ease } from "@/lib/motion";
import { Button } from "./Button";
import { CountUpPoints, CountUpTime, GameClock, PointsDisplay, TimeDisplay } from "./TimeDisplay";

interface PlaySessionProps<P> {
  game: GameMeta;
  module: GameModule<P>;
  board: BoardKey;
  mode: Mode;
  /** Link for the primary action after a daily board, e.g. the next game in the daily set. */
  nextDailyHref: string | null;
  onExit: () => void;
  onNext: () => void;
}

interface Finished {
  timeMs: number;
  detail: SolveDetail;
  summary: ResultSummary;
  streak: number;
}

export function PlaySession<P>({ game, module, board, mode, nextDailyHref, onExit, onNext }: PlaySessionProps<P>) {
  const [puzzle, setPuzzle] = useState<P | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [startedAt, setStartedAt] = useState(() => performance.now());

  // Boards may load content first; the clock starts when the board is ready.
  useEffect(() => {
    let live = true;
    Promise.resolve()
      .then(() => module.generate(board))
      .then((p) => {
        if (!live) return;
        setPuzzle(p);
        setStartedAt(performance.now());
      })
      .catch(() => live && setLoadError(true));
    return () => {
      live = false;
    };
  }, [module, board]);
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);
  const [showResult, setShowResult] = useState(false);
  const recorded = useRef(false);

  const handleSolved = useCallback(
    (detail: SolveDetail) => {
      if (recorded.current) return;
      recorded.current = true;
      const end = performance.now();
      const timeMs = end - startedAt;
      const today = new Date();
      const prev = loadStats(game.id);
      const summary = applyResult(
        prev,
        {
          tier: board.tier,
          mode,
          timeMs,
          solved: true,
          points: module.scoring === "points" ? (detail.points ?? 0) : undefined,
          dateKey: mode === "daily" ? utcDateKey(today) : undefined,
        },
        module.parMs[board.tier],
      );
      saveStats(game.id, summary.stats);
      setStoppedAt(end);
      setFinished({ timeMs, detail, summary, streak: dailyStreak(summary.stats.dailyDone, utcDateKey(today)) });
      // Let the solve ripple play before the result takes the stage. Scored games have no ripple.
      setTimeout(() => setShowResult(true), module.scoring === "points" ? 150 : 950);
    },
    [board.tier, game.id, mode, module.parMs, module.scoring, startedAt],
  );

  const Board = module.Board;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {showResult && finished ? (
        <Result key="result" game={game} module={module} board={board} mode={mode} finished={finished} nextDailyHref={nextDailyHref} onExit={onExit} onNext={onNext} />
      ) : (
        <motion.div
          key="board"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: dur.base, ease: ease.out }}
          className="flex flex-1 flex-col gap-5 p-5 sm:p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-caption uppercase tracking-wide text-steel">
                {board.tier} · {mode}
              </span>
              <span className="text-caption text-steel">seed {board.seed}</span>
            </div>
            {module.scoring !== "points" && puzzle && <GameClock startedAt={startedAt} stoppedAt={stoppedAt} />}
          </div>
          <div className="flex flex-1 items-center justify-center">
            {puzzle ? (
              <Board puzzle={puzzle} onSolved={handleSolved} />
            ) : loadError ? (
              <div className="flex flex-col items-center gap-3 text-center text-fog">
                <p>The board couldn&apos;t load. Check your connection.</p>
                <Button variant="ghost" arrow={false} onClick={onExit}>
                  ← menu
                </Button>
              </div>
            ) : (
              <p className="animate-pulse font-mono text-caption uppercase tracking-wide text-steel">building board</p>
            )}
          </div>
          {module.scoring !== "points" && <p className="text-center text-fog">{game.rules}</p>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Result<P>({
  game,
  module,
  board,
  mode,
  finished,
  nextDailyHref,
  onExit,
  onNext,
}: Omit<PlaySessionProps<P>, never> & { finished: Finished }) {
  const { summary, timeMs, detail, streak } = finished;
  const line = useMemo(
    () => createRng(`${boardSeed(board)}:line`).pick(module.lines[summary.band]),
    [board, module.lines, summary.band],
  );
  const scored = module.scoring === "points";
  const bestMs = summary.stats.bestMs[board.tier];
  const bestPoints = summary.stats.bestPoints[board.tier];
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
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: dur.slow, ease: ease.springStrong }}
      className="flex flex-1 flex-col gap-6 p-6"
    >
      <p className="text-caption uppercase tracking-wide text-steel">
        {game.name} · {board.tier} · {scored ? "score" : "solved"}
      </p>

      <div className="flex flex-col gap-3">
        {scored ? (
          <CountUpPoints points={detail.points ?? 0} className="text-number-lg font-bold" />
        ) : (
          <CountUpTime ms={timeMs} className="text-number-lg font-bold" />
        )}
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur.base, ease: ease.out, delay: dur.count + 0.2 }}
          className="text-heading-sm text-fog"
        >
          {line}
        </motion.p>
      </div>

      <dl className="grid grid-cols-3 gap-4 border-y border-iron py-4">
        <div className="flex flex-col gap-1">
          <dt className="text-caption uppercase text-steel">{summary.newBest ? "new best" : "best"}</dt>
          <dd className="text-heading-sm">
            {scored ? (
              bestPoints !== undefined ? <PointsDisplay points={bestPoints} /> : "--"
            ) : bestMs ? (
              <TimeDisplay ms={bestMs} />
            ) : (
              "--"
            )}
          </dd>
        </div>
        {mode === "daily" ? (
          <div className="flex flex-col gap-1">
            <dt className="text-caption uppercase text-steel">streak</dt>
            <dd className="font-mono text-heading-sm">{streak}</dd>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <dt className="text-caption uppercase text-steel">rating</dt>
            <dd className="font-mono text-heading-sm">
              {summary.stats.rating}{" "}
              <span className="text-ash">
                {summary.ratingDelta >= 0 ? "+" : ""}
                {summary.ratingDelta}
              </span>
            </dd>
          </div>
        )}
        {detail.extra && (
          <div className="flex flex-col gap-1">
            <dt className="text-caption uppercase text-steel">{detail.extra.label}</dt>
            <dd className="font-mono text-heading-sm">{detail.extra.value}</dd>
          </div>
        )}
      </dl>

      <div className="mt-auto flex flex-col gap-3">
        {mode === "daily" && nextDailyHref ? (
          <Link
            href={nextDailyHref}
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ember px-6 font-mono text-[15px] font-bold text-void transition-colors duration-[var(--dur-fast)] hover:bg-ember-hover"
          >
            next daily game
            <span aria-hidden className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:translate-x-1">
              →
            </span>
          </Link>
        ) : (
          <Button onClick={onNext} className="w-full">
            {mode === "daily" ? "practice this game" : "next board"}
          </Button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="ghost" arrow={false} onClick={onExit}>
            ← menu
          </Button>
          <Button variant="ghost" arrow={false} onClick={share}>
            {copied ? "copied ✓" : "share board"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
