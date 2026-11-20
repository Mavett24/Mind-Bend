"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { GAMES, type GameMeta } from "@/games/registry";
import type { GameModule, SolveDetail } from "@/games/types";
import type { Tier } from "@/engine/difficulty";
import { boardSeed, challengeQuery, type BoardKey, type Mode } from "@/engine/seed";
import { createRng } from "@/engine/rng";
import { outcomeScore } from "@/engine/rating";
import { pointsBand, pointsOutcome, timeBand, type Band } from "@/engine/stats";
import { dayKey, gameSummary, insightFor, overall, ratingOutcome, tierProgress, type GameRecord, type GameSummary, type ResultInsight } from "@/engine/history";
import { newRecordId } from "@/lib/history";
import { sendEvents } from "@/lib/analytics";
import { gameStart, type PlayContext } from "@/lib/events";
import { PlayTracking, recordGame, trackShare, useAbandonOnClose } from "@/lib/track";
import { scoringOf } from "@/lib/profile";
import { dur, ease } from "@/lib/motion";
import { Button } from "./Button";
import { GameIcon, hue } from "./GameIcon";
import { TierBar } from "./charts";
import { CountUpPoints, CountUpTime, GameClock, PointsDisplay, TimeDisplay } from "./TimeDisplay";

/** Leaving a board after this long counts as a quit in your history (it never changes your rating). */
const QUIT_AFTER_MS = 5000;

interface PlaySessionProps<P> {
  game: GameMeta;
  module: GameModule<P>;
  board: BoardKey;
  mode: Mode;
  /** Link for the primary action after a daily board, e.g. the next game in the daily set. */
  nextDailyHref: string | null;
  onExit: () => void;
  /** Next practice board, optionally at a new tier after a level up. */
  onNext: (tier?: Tier) => void;
}

interface Finished {
  record: GameRecord;
  detail: SolveDetail;
  insight: ResultInsight;
  summary: GameSummary;
  band: Band;
  streak: number;
  dailyDone: number;
  /** The first daily game still open today, if any. */
  nextDaily: string | null;
}

export function PlaySession<P>({ game, module, board, mode, nextDailyHref, onExit, onNext }: PlaySessionProps<P>) {
  const [puzzle, setPuzzle] = useState<P | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [startedAt, setStartedAt] = useState(() => performance.now());
  const readyAt = useRef<number | null>(null);
  const recorded = useRef(false);
  const ctx = useMemo<PlayContext>(() => ({ game: game.id, tier: board.tier, mode }), [game.id, board.tier, mode]);

  // Boards may load content first; the clock starts when the board is ready.
  useEffect(() => {
    let live = true;
    Promise.resolve()
      .then(() => module.generate(board))
      .then((p) => {
        if (!live) return;
        setPuzzle(p);
        const now = performance.now();
        readyAt.current = now;
        setStartedAt(now);
        sendEvents(gameStart({ game: board.gameId, tier: board.tier, mode }));
      })
      .catch(() => live && setLoadError(true));
    return () => {
      live = false;
    };
  }, [module, board, mode]);

  // Walking away from a started board is recorded as a quit, so completion rate is honest.
  useEffect(() => {
    return () => {
      const at = readyAt.current;
      if (recorded.current || at === null) return;
      const timeMs = performance.now() - at;
      if (timeMs < QUIT_AFTER_MS) return;
      recorded.current = true;
      recordGame({ id: newRecordId(), at: Date.now(), gameId: game.id, tier: board.tier, mode, seed: board.seed, timeMs, solved: false, quit: true });
    };
  }, [game.id, board.tier, board.seed, mode]);

  // Closing the tab mid-board: GA only, see useAbandonOnClose.
  useAbandonOnClose(() => (recorded.current || readyAt.current === null ? null : { ctx, startedAt: readyAt.current }), QUIT_AFTER_MS);

  const [stoppedAt, setStoppedAt] = useState<number | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSolved = useCallback(
    (detail: SolveDetail) => {
      if (recorded.current) return;
      recorded.current = true;
      const end = performance.now();
      const timeMs = end - startedAt;
      const scored = module.scoring === "points";
      const points = scored ? (detail.points ?? 0) : undefined;
      const hints = detail.extra?.label === "hints" ? detail.extra.value : 0;
      const parMs = module.parMs[board.tier];
      const base = scored ? pointsOutcome(points!) : outcomeScore(true, timeMs, parMs);
      const record: GameRecord = {
        id: newRecordId(),
        at: Date.now(),
        gameId: game.id,
        tier: board.tier,
        mode,
        seed: board.seed,
        timeMs,
        solved: true,
        points,
        hints: hints || undefined,
        // Daily boards are shared by everyone and don't move your rating.
        outcome: mode === "daily" ? undefined : ratingOutcome(base, hints),
      };
      const data = recordGame(record);
      const scoring = scoringOf(game.id);
      const today = dayKey(record.at);
      setStoppedAt(end);
      setFinished({
        record,
        detail,
        insight: insightFor(data, record, scoring),
        summary: gameSummary(data, game.id, scoring),
        band: scored ? pointsBand(points!) : timeBand(timeMs, parMs),
        streak: overall(data, record.at).streak,
        dailyDone: GAMES.filter((g) => gameSummary(data, g.id, scoringOf(g.id)).dailyDone.has(today)).length,
        nextDaily: GAMES.find((g) => !gameSummary(data, g.id, scoringOf(g.id)).dailyDone.has(today))?.id ?? null,
      });
      // Let the solve ripple play before the result takes the stage. Scored games have no ripple.
      setTimeout(() => setShowResult(true), scored ? 150 : 950);
    },
    [board.tier, board.seed, game.id, mode, module.parMs, module.scoring, startedAt],
  );

  const Board = module.Board;

  return (
    <PlayTracking.Provider value={ctx}>
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
              <span className="text-caption uppercase text-ash">
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
              <p className="animate-pulse font-mono text-caption uppercase text-steel">building board</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </PlayTracking.Provider>
  );
}

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

function Result<P>({ game, module, board, mode, finished, nextDailyHref, onExit, onNext }: PlaySessionProps<P> & { finished: Finished }) {
  const { record, detail, insight, summary, band, streak, dailyDone, nextDaily } = finished;
  const dailyHref = nextDaily ? `/play/${nextDaily}?m=daily` : nextDailyHref;
  const line = useMemo(() => createRng(`${boardSeed(board)}:line`).pick(module.lines[band]), [board, module.lines, band]);
  const scored = module.scoring === "points";
  const best = summary.best[board.tier];
  const [copied, setCopied] = useState(false);
  const before = tierProgress(insight.ratingBefore);
  const after = tierProgress(insight.ratingAfter);
  const delta = insight.ratingAfter - insight.ratingBefore;
  const color = hue(game.id);

  const chips: string[] = [];
  if (insight.newBest) chips.push("new best");
  if (insight.of > 1) chips.push(insight.rank === 1 && !insight.newBest ? `ties your best of ${insight.of}` : `${ordinal(insight.rank)} of ${insight.of} at ${board.tier}`);
  if (insight.vsRecent !== null && Math.abs(insight.vsRecent) >= 0.03) {
    const pct = Math.round(Math.abs(insight.vsRecent) * 100);
    chips.push(scored ? `${pct}% ${insight.vsRecent > 0 ? "above" : "below"} your average` : `${pct}% ${insight.vsRecent > 0 ? "faster" : "slower"} than your average`);
  }
  if (insight.of === 1) chips.push(`first ${board.tier} solve`);

  async function share() {
    const url = `${window.location.origin}/play/${board.gameId}?${challengeQuery(board)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
      trackShare(board.gameId, "clipboard");
    } catch {
      window.prompt("Copy this challenge link", url);
      trackShare(board.gameId, "prompt");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: dur.slow, ease: ease.springStrong }}
      className="flex flex-1 flex-col gap-5 p-6"
    >
      <p className="flex items-center gap-2 text-caption uppercase text-ash">
        <GameIcon id={game.id} size={22} />
        {game.name} · {board.tier} · {mode}
      </p>

      <div className="flex flex-col gap-3">
        {scored ? (
          <CountUpPoints points={detail.points ?? 0} className="text-number-lg" />
        ) : (
          <CountUpTime ms={record.timeMs} className="text-number-lg" />
        )}
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur.base, ease: ease.out, delay: dur.count + 0.1 }}
          className="text-heading-sm text-fog"
        >
          {line}
        </motion.p>
        {chips.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {chips.map((c, i) => (
              <motion.li
                key={c}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: dur.base, ease: ease.spring, delay: dur.count + 0.25 + i * 0.08 }}
                className={`rounded-full px-2.5 py-1 font-mono text-caption ${c === "new best" ? "bg-paper font-medium text-void" : "bg-white/[0.06] text-chalk"}`}
              >
                {c}
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      {mode === "daily" ? (
        <div className="well flex flex-col gap-3 rounded-[18px] p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-caption uppercase text-ash">daily set</span>
            <span className="font-mono text-caption text-ash">{streak}d streak</span>
          </div>
          <span className="font-mono text-heading-lg">
            {dailyDone}
            <span className="text-steel">/{GAMES.length} today</span>
          </span>
          <TierBar progress={dailyDone / GAMES.length} from={(dailyDone - 1) / GAMES.length} delay={0.4} />
          <span className="text-caption text-steel">Daily boards count for streaks and bests, not your rating.</span>
        </div>
      ) : (
        <div className="well flex flex-col gap-3 rounded-[18px] p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-caption uppercase text-ash">rating</span>
            <span className="font-num text-heading-lg">
              {insight.ratingAfter}{" "}
              <span className={delta >= 0 ? "text-paper" : "text-ash"} style={delta > 0 ? { color } : undefined}>
                {delta >= 0 ? "+" : ""}
                {delta}
              </span>
            </span>
          </div>
          <TierBar
            progress={after.next ? after.progress : 1}
            from={after.current === before.current ? before.progress : 0}
            color={color}
            delay={0.4}
          />
          <span className="font-mono text-caption text-ash">
            {insight.promoted
              ? `Level up: ${after.current} is now your suggested tier.`
              : after.next
                ? `${after.nextAt! - insight.ratingAfter} to ${after.next}`
                : "top tier. keep it there."}
            {record.hints ? ` · ${record.hints} ${record.hints === 1 ? "hint" : "hints"} cost some rating` : ""}
          </span>
        </div>
      )}

      <dl className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <dt className="text-caption uppercase text-steel">best</dt>
          <dd className="text-heading-sm">
            {best === undefined ? "--" : scored ? <PointsDisplay points={best} /> : <TimeDisplay ms={best} />}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-caption uppercase text-steel">played</dt>
          <dd className="font-mono text-heading-sm">{summary.played}</dd>
        </div>
        {detail.extra && (
          <div className="flex flex-col gap-1">
            <dt className="text-caption uppercase text-steel">{detail.extra.label}</dt>
            <dd className="font-mono text-heading-sm">{detail.extra.value}</dd>
          </div>
        )}
      </dl>

      <div className="mt-auto flex flex-col gap-3">
        {mode === "daily" && nextDaily && dailyHref ? (
          <Link
            href={dailyHref}
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-paper px-6 font-mono text-[15px] font-medium text-void transition-colors duration-[var(--dur-fast)] hover:bg-white"
          >
            next daily game
            <span aria-hidden className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:translate-x-1">
              →
            </span>
          </Link>
        ) : (
          <Button onClick={() => onNext(insight.promoted ? after.current : undefined)} className="w-full">
            {mode === "daily" ? "practice this game" : insight.promoted ? `next board · ${after.current}` : "next board"}
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
