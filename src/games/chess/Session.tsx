"use client";

/**
 * The chess play loop, chess.com style: puzzle after puzzle without leaving the board, your rating
 * moving after each one. Practice is endless; the daily is a set of three that ramps up.
 * Owns its own flow (instead of the shared PlaySession) because a puzzle is seconds long and
 * the result belongs beside the board, not on a separate screen.
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Square } from "chess.js";
import { GAMES, type GameMeta } from "@/games/registry";
import type { Tier } from "@/engine/difficulty";
import { createRng } from "@/engine/rng";
import { challengeQuery, type Mode } from "@/engine/seed";
import { dayKey, gameSummary, overall, type GameRecord } from "@/engine/history";
import { getHistory, newRecordId, useHistory } from "@/lib/history";
import { sendEvents } from "@/lib/analytics";
import { gameStart, unrecordedComplete, type PlayContext } from "@/lib/events";
import { PlayTracking, recordGame, trackShare, useAbandonOnClose } from "@/lib/track";
import { scoringOf } from "@/lib/profile";
import { dur, ease } from "@/lib/motion";
import { Button } from "@/components/Button";
import { HintButton } from "@/components/HintButton";
import { GameIcon, hue } from "@/components/GameIcon";
import { TierBar } from "@/components/charts";
import { TimeDisplay, useCountUp } from "@/components/TimeDisplay";
import { ChessBoard, type Hint, type Marker } from "./Board";
import { loadPool, loadPuzzle } from "./data";
import {
  DAILY_TARGETS,
  DAILY_TIERS,
  isComplete,
  judgeMove,
  parsePuzzleSeed,
  parseUci,
  pickPuzzle,
  playerColor,
  playerMoves,
  positionAt,
  practiceTarget,
  puzzleSeed,
  ratingMilestone,
  speedBonus,
  targetMs,
  themeLabels,
  type ChessPuzzle,
  type Move,
} from "./engine";

const SETUP_DELAY_MS = 550;
const REPLY_DELAY_MS = 420;
const WRONG_HOLD_MS = 750;
const SOLUTION_STEP_MS = 650;
/** Leaving a puzzle after this long counts as a quit in your history (never rated). */
const QUIT_AFTER_MS = 5000;

const LINES = {
  clean: ["That's the move.", "Saw it straight away.", "Clean.", "No notes."],
  solved: ["Found it.", "Got there.", "Correct, and it counts.", "The board agrees."],
  helped: ["Solved, with a nudge.", "Hints spent, line found.", "Teamwork."],
  failed: ["Not the move.", "The board had other plans.", "Close. The board disagrees.", "That one bites back."],
};

export interface ChessSessionProps {
  game: GameMeta;
  mode: Mode;
  tier: Tier;
  /** Practice: a random seed for this run. Daily: daily-YYYY-MM-DD. Challenge: <band>-<id>. */
  seed: string;
  onExit: () => void;
}

type Phase = "loading" | "setup" | "play" | "reply" | "solved" | "failed" | "solution" | "error";

interface Played {
  attempt: number;
  record: GameRecord;
  puzzle: ChessPuzzle;
  rated: boolean;
  delta: number;
  ratingAfter: number;
}

const seenIds = (records: GameRecord[]) =>
  new Set(records.filter((r) => r.gameId === "chess").map((r) => parsePuzzleSeed(r.seed)?.id).filter((x): x is string => !!x));

export function ChessSession({ game, mode, tier, seed, onExit }: ChessSessionProps) {
  const history = useHistory();
  const summary = useMemo(() => (history ? gameSummary(history, "chess", scoringOf("chess")) : null), [history]);
  const rating = summary?.rating ?? 1200;
  const color = hue("chess");

  /** Puzzles played in this run, in order (practice keeps going, daily stops at three). */
  const [played, setPlayed] = useState<Played[]>([]);
  const [index, setIndex] = useState(0);
  const [puzzle, setPuzzle] = useState<ChessPuzzle | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [ply, setPly] = useState(0);
  const [display, setDisplay] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [marker, setMarker] = useState<Marker | null>(null);
  const [shake, setShake] = useState(0);
  const [hint, setHint] = useState<Hint | null>(null);
  const [hints, setHints] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [stoppedMs, setStoppedMs] = useState<number | null>(null);
  /** False on retries and on puzzles you've already seen: they replay without touching your rating. */
  const [rated, setRated] = useState(true);
  const [announce, setAnnounce] = useState("");
  const recorded = useRef(false);
  const timers = useRef<number[]>([]);

  const dailyDone = mode === "daily" && index >= DAILY_TARGETS.length;
  /** The board for analytics: daily puzzles carry their own tier (D-062). */
  const ctx = useMemo<PlayContext>(() => ({ game: "chess", tier: mode === "daily" ? (DAILY_TIERS[index] ?? tier) : tier, mode }), [mode, index, tier]);
  /** Bumped on retry, so a result only shows for the attempt it belongs to. */
  const [attempt, setAttempt] = useState(0);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => () => clearTimers(), []);

  // ------------------------------------------------------------ choosing and loading a puzzle

  useEffect(() => {
    if (!history || dailyDone) return;
    let live = true;
    const seen = seenIds(getHistory().records);
    (async () => {
      let p: ChessPuzzle | null = null;
      if (mode === "challenge" && index === 0) {
        const ref = parsePuzzleSeed(seed);
        p = ref ? await loadPuzzle(ref.band, ref.id) : null;
      } else if (mode === "daily") {
        const rng = createRng(`chess:${seed}:${index}`);
        p = pickPuzzle(await loadPool(DAILY_TARGETS[index]), DAILY_TARGETS[index], rng);
      } else {
        const rng = createRng(`chess:${seed}:${index}`);
        const target = practiceTarget(gameSummary(getHistory(), "chess", "time").rating, tier, rng);
        p = pickPuzzle(await loadPool(target), target, rng, seen);
      }
      if (!live) return;
      if (!p) {
        setPhase("error");
        return;
      }
      clearTimers();
      recorded.current = false;
      setPuzzle(p);
      setRated(!seen.has(p.id));
      setPly(0);
      setDisplay(positionAt(p, 0).fen());
      setLastMove(null);
      setMarker(null);
      setHint(null);
      setHints(0);
      setStoppedMs(null);
      setStartedAt(null);
      setPhase("setup");
      // The opponent's move that sets up the puzzle, then the clock starts.
      later(() => {
        const first = parseUci(p.moves[0]);
        setDisplay(positionAt(p, 1).fen());
        setLastMove({ from: first.from, to: first.to });
        setPly(1);
        setPhase("play");
        setStartedAt(performance.now());
        sendEvents(gameStart({ game: "chess", tier: mode === "daily" ? (DAILY_TIERS[index] ?? tier) : tier, mode }));
        setAnnounce(`${playerColor(p) === "w" ? "White" : "Black"} to move. Find the best move.`);
      }, SETUP_DELAY_MS);
    })().catch(() => live && setPhase("error"));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a new puzzle only when the index moves
  }, [index, history === null, dailyDone]);

  // Clock tick for the timer and the speed chip.
  useEffect(() => {
    if (startedAt === null || stoppedMs !== null) return;
    const id = window.setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(id);
  }, [startedAt, stoppedMs]);

  const elapsed = stoppedMs ?? (startedAt === null ? 0 : Math.max(0, now - startedAt));
  const target = puzzle ? targetMs(puzzle.rating, playerMoves(puzzle)) : 0;
  const liveBonus = rated && hints === 0 ? speedBonus(elapsed, target) : 0;

  // Walking away from a puzzle in progress is a quit: kept for completion rate, never rated.
  const progress = useRef<{ puzzle: ChessPuzzle | null; startedAt: number | null; phase: Phase }>({ puzzle: null, startedAt: null, phase: "loading" });
  useEffect(() => {
    progress.current = { puzzle, startedAt, phase };
  }, [puzzle, startedAt, phase]);
  useEffect(() => {
    return () => {
      const { puzzle: p, startedAt: at, phase: ph } = progress.current;
      if (!p || at === null || recorded.current || (ph !== "play" && ph !== "reply")) return;
      const timeMs = performance.now() - at;
      if (timeMs < QUIT_AFTER_MS) return;
      recordGame({ id: newRecordId(), at: Date.now(), gameId: "chess", tier, mode, seed: puzzleSeed(p), timeMs, solved: false, quit: true, opponent: p.rating });
    };
  }, [mode, tier]);

  // Closing the tab mid-puzzle: GA only, see useAbandonOnClose.
  useAbandonOnClose(() => {
    const { puzzle: p, startedAt: at, phase: ph } = progress.current;
    if (!p || at === null || recorded.current || (ph !== "play" && ph !== "reply")) return null;
    return { ctx, startedAt: at };
  }, QUIT_AFTER_MS);

  // ------------------------------------------------------------ results

  const finish = useCallback(
    (solved: boolean, timeMs: number) => {
      if (!puzzle || recorded.current) return;
      recorded.current = true;
      const bonus = solved && rated && hints === 0 ? speedBonus(timeMs, target) : 0;
      const record: GameRecord = {
        id: newRecordId(),
        at: Date.now(),
        gameId: "chess",
        tier: mode === "daily" ? DAILY_TIERS[index] : tier,
        mode,
        seed: puzzleSeed(puzzle),
        timeMs,
        solved,
        hints: hints || undefined,
        outcome: rated ? (solved ? 1 : 0) : undefined,
        opponent: puzzle.rating,
        bonus: bonus || undefined,
      };
      const data = recordGame(record);
      const after = gameSummary(data, "chess", "time");
      setPlayed((list) => [...list, { attempt, record, puzzle, rated, delta: after.deltas.get(record.id) ?? 0, ratingAfter: after.rating }]);
    },
    [puzzle, rated, hints, target, mode, index, tier, attempt],
  );

  // ------------------------------------------------------------ moves

  const onMove = useCallback(
    (move: Move) => {
      if (!puzzle || phase !== "play") return;
      const verdict = judgeMove(puzzle, ply, move);
      if (verdict === "illegal") return;
      const game = positionAt(puzzle, ply);
      const made = game.move({ from: move.from, to: move.to, promotion: move.promotion ?? "q" });
      setDisplay(game.fen());
      setLastMove({ from: made.from, to: made.to });
      setHint(null);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(verdict === "wrong" ? [20, 40, 20] : 8);

      if (verdict === "wrong") {
        const t = startedAt === null ? 0 : performance.now() - startedAt;
        setStoppedMs(t);
        setMarker({ square: made.to, kind: "wrong" });
        setShake((n) => n + 1);
        setPhase("failed");
        setAnnounce(`${made.san} is not the move. Puzzle failed.`);
        if (rated && !recorded.current) finish(false, t);
        else {
          recorded.current = true;
          sendEvents(unrecordedComplete(ctx, { solved: false, timeMs: t, hints, puzzleRating: puzzle.rating }));
        }
        // Put the board back so you can see what you missed.
        later(() => {
          setDisplay(positionAt(puzzle, ply).fen());
          const prev = parseUci(puzzle.moves[ply - 1]);
          setLastMove({ from: prev.from, to: prev.to });
          setMarker(null);
        }, WRONG_HOLD_MS);
        return;
      }

      setMarker({ square: made.to, kind: "correct" });
      const nextPly = ply + 1;
      if (verdict === "mate" || isComplete(puzzle, nextPly)) {
        const t = startedAt === null ? 0 : performance.now() - startedAt;
        setStoppedMs(t);
        setPly(nextPly);
        setPhase("solved");
        setAnnounce(`${made.san}. Solved.`);
        if (recorded.current) sendEvents(unrecordedComplete(ctx, { solved: true, timeMs: t, hints, puzzleRating: puzzle.rating }));
        else finish(true, t);
        return;
      }
      setPly(nextPly);
      setPhase("reply");
      setAnnounce(`${made.san}. Correct, keep going.`);
      later(() => {
        const reply = parseUci(puzzle.moves[nextPly]);
        const g = positionAt(puzzle, nextPly + 1);
        setDisplay(g.fen());
        setLastMove({ from: reply.from, to: reply.to });
        setMarker(null);
        setPly(nextPly + 1);
        setPhase("play");
        setAnnounce(`Opponent played ${g.history().at(-1) ?? ""}. Your move.`);
      }, REPLY_DELAY_MS);
    },
    [puzzle, phase, ply, startedAt, rated, finish, later, ctx, hints],
  );

  const giveHint = () => {
    if (!puzzle || phase !== "play") return;
    const m = parseUci(puzzle.moves[ply]);
    if (!hint) setHint({ from: m.from });
    else if (!hint.to) setHint({ from: m.from, to: m.to });
    else return;
    setHints((n) => n + 1);
  };

  const showSolution = () => {
    if (!puzzle) return;
    clearTimers();
    setPhase("solution");
    setMarker(null);
    setHint(null);
    let p = ply;
    const step = () => {
      if (p >= puzzle.moves.length) return;
      const m = parseUci(puzzle.moves[p]);
      p += 1;
      setDisplay(positionAt(puzzle, p).fen());
      setLastMove({ from: m.from, to: m.to });
      setPly(p);
      if (p < puzzle.moves.length) later(step, SOLUTION_STEP_MS);
    };
    later(step, 200);
  };

  /** Play the same puzzle again from the start. Never rated: you've seen it now. */
  const retry = () => {
    if (!puzzle) return;
    clearTimers();
    setRated(false);
    setAttempt((a) => a + 1);
    setPly(1);
    setDisplay(positionAt(puzzle, 1).fen());
    const first = parseUci(puzzle.moves[0]);
    setLastMove({ from: first.from, to: first.to });
    setMarker(null);
    setHint(null);
    setHints(0);
    setStoppedMs(null);
    setStartedAt(performance.now());
    setPhase("play");
    sendEvents(gameStart(ctx, { retry: true }));
    setAnnounce("Again. Find the best move.");
  };

  // A challenge link is one puzzle; after it the run carries on as practice (index > 0).
  const next = () => {
    setPhase("loading");
    setIndex((i) => i + 1);
  };

  // ------------------------------------------------------------ render

  if (dailyDone) return <DailySummary game={game} played={played} history={history} onExit={onExit} />;

  const orientation = puzzle ? playerColor(puzzle) : "w";
  const ended = phase === "solved" || phase === "failed" || phase === "solution";
  const last = played.at(-1);
  // The recorded result for this attempt, or an unrated one for a retry (retries aren't saved).
  const result: Played | null =
    !ended || !puzzle
      ? null
      : last && last.puzzle.id === puzzle.id && last.attempt === attempt
        ? last
        : {
            attempt,
            puzzle,
            rated: false,
            delta: 0,
            ratingAfter: rating,
            record: { id: "retry", at: 0, gameId: "chess", tier, mode, seed: puzzleSeed(puzzle), timeMs: elapsed, solved: phase !== "failed" },
          };
  const runStreak = (() => {
    let n = 0;
    for (let i = played.length - 1; i >= 0 && played[i].record.solved; i--) n++;
    return n;
  })();
  const status =
    phase === "loading" || phase === "setup"
      ? "setting up"
      : phase === "solved"
        ? "solved"
        : phase === "failed"
          ? "not the move"
          : phase === "solution"
            ? "the solution"
            : phase === "reply"
              ? "correct, keep going"
              : `${orientation === "w" ? "white" : "black"} to move`;

  return (
    <PlayTracking.Provider value={ctx}>
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: dur.base, ease: ease.out }}
      className="flex flex-1 flex-col gap-4 p-3 sm:p-5"
    >
      {/* Header strip: where you are, your rating, the clock. */}
      <div className="flex items-end justify-between px-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-caption uppercase tracking-wide text-ash">
            {mode === "daily" ? `daily · ${played.length + (ended ? 0 : 1)} of ${DAILY_TARGETS.length}` : mode === "challenge" && index === 0 ? "challenge" : `practice · ${tier}`}
            {!rated && !ended && <span className="text-steel"> · unrated</span>}
          </span>
          <span className="font-mono text-heading-sm tabular-nums">
            {result && result.rated ? <RatingChange before={result.ratingAfter - result.delta} delta={result.delta} color={color} /> : rating}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <SpeedChip bonus={liveBonus} show={rated && hints === 0 && (phase === "play" || phase === "reply" || (phase === "solved" && liveBonus > 0))} />
          <TimeDisplay ms={elapsed} className={`text-heading-lg ${ended ? "text-fog" : ""}`} />
        </div>
      </div>

      {mode === "daily" && (
        <div className="flex gap-1.5 px-1" aria-hidden>
          {DAILY_TARGETS.map((_, i) => {
            const r = played[i];
            return (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full ${r ? (r.record.solved ? "" : "bg-slate") : i === played.length ? "bg-white/[0.25]" : "bg-white/[0.08]"}`}
                style={r?.record.solved ? { background: color } : undefined}
              />
            );
          })}
        </div>
      )}

      {/* The board */}
      <div className="relative">
        {display ? (
          <ChessBoard
            fen={display}
            orientation={orientation}
            lastMove={lastMove}
            movable={phase === "play" ? orientation : null}
            onMove={onMove}
            hint={hint}
            marker={marker}
            shake={shake}
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-control bg-void shadow-[0_0_0_1px_rgba(255,255,255,0.07)]">
            {phase === "error" ? (
              <div className="flex flex-col items-center gap-3 px-6 text-center text-fog">
                <p>The puzzle couldn&apos;t load. Check your connection.</p>
                <Button variant="ghost" arrow={false} onClick={onExit}>
                  ← menu
                </Button>
              </div>
            ) : (
              <p className="animate-pulse font-mono text-caption uppercase tracking-wide text-fog">loading puzzles</p>
            )}
          </div>
        )}
      </div>

      {/* Status and actions */}
      <div className="flex min-h-[132px] flex-col gap-3 px-1">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-mono text-[15px]">
            <TurnDot color={orientation} done={phase === "solved"} failed={phase === "failed"} />
            <span className={phase === "failed" ? "text-paper" : "text-chalk"}>{ended && result ? <ResultHeadline played={result} hints={hints} /> : status}</span>
            {runStreak >= 2 && !ended && <span className="text-caption text-ash">· {runStreak} in a row</span>}
          </p>
          {(phase === "play" || phase === "reply" || phase === "setup") && (
            <HintButton onHint={giveHint} count={hints} disabled={phase !== "play" || (hint?.to !== undefined)} />
          )}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {ended && result && puzzle ? (
            <motion.div
              key={`result-${puzzle.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: dur.base, ease: ease.spring }}
              className="flex flex-col gap-3"
            >
              <ResultChips played={result} hints={hints} puzzle={puzzle} />
              <div className="grid grid-cols-[auto_auto_1fr] gap-2">
                {phase === "failed" ? (
                  <>
                    <Button variant="ghost" arrow={false} onClick={retry} className="px-4">
                      retry
                    </Button>
                    <Button variant="ghost" arrow={false} onClick={showSolution} className="px-4">
                      solution
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" arrow={false} onClick={onExit} className="px-4" aria-label="menu">
                      ←
                    </Button>
                    <ShareButton puzzle={puzzle} />
                  </>
                )}
                <Button onClick={next} className="w-full">
                  {mode === "daily" ? (played.length >= DAILY_TARGETS.length ? "see your set" : `puzzle ${played.length + 1} of ${DAILY_TARGETS.length}`) : "next"}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.p
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: dur.fast }}
              className="text-body text-ash"
            >
              {phase === "play" && ply === 1 && hints === 0 ? "Find the best move. One wrong move and it's over." : null}
              {phase === "play" && hints === 1 && "The glowing piece moves. Half rating if you find it."}
              {phase === "play" && hints >= 2 && hint?.to && "There's the move. No rating for this one, no loss either."}
              {phase === "play" && ply > 1 && hints === 0 && "Keep going. Every move has to be the best one."}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </motion.div>
    </PlayTracking.Provider>
  );
}

// ---------------------------------------------------------------- small pieces of the session

function TurnDot({ color, done, failed }: { color: "w" | "b"; done: boolean; failed: boolean }) {
  if (done) return <span className="flex h-4 w-4 items-center justify-center rounded-full bg-paper text-[10px] font-bold text-void">✓</span>;
  if (failed) return <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ember text-[11px] font-bold text-void">×</span>;
  return <span className={`h-3.5 w-3.5 rounded-full ${color === "w" ? "bg-paper" : "bg-[#161616] shadow-[inset_0_0_0_1.5px_var(--color-chalk)]"}`} />;
}

/** The speed bonus you'd get if you solved right now, ticking down as the clock runs. */
function SpeedChip({ bonus, show }: { bonus: number; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: bonus > 0 ? 1 : 0.5, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: dur.base, ease: ease.spring }}
          className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-caption tabular-nums text-chalk"
          title="speed bonus if you solve now"
        >
          speed +{bonus}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function RatingChange({ before, delta, color }: { before: number; delta: number; color: string }) {
  const shown = Math.round(useCountUp(delta, 900));
  return (
    <span>
      {before + shown}{" "}
      <span className={delta >= 0 ? "" : "text-ash"} style={delta > 0 ? { color } : undefined}>
        {delta >= 0 ? "+" : ""}
        {shown}
      </span>
    </span>
  );
}

/** The one-line verdict, in the voice of the other games' score lines. */
function ResultHeadline({ played, hints }: { played: Played; hints: number }) {
  const { record, rated, delta, puzzle } = played;
  const kind = !record.solved ? "failed" : hints ? "helped" : record.bonus ? "clean" : "solved";
  const line = useMemo(() => createRng(`${puzzle.id}:${kind}:line`).pick(LINES[kind]), [puzzle.id, kind]);
  return (
    <>
      {line}
      {rated && <span className="sr-only"> Rating {delta >= 0 ? "up" : "down"} {Math.abs(delta)}.</span>}
    </>
  );
}

function ResultChips({ played, hints, puzzle }: { played: Played; hints: number; puzzle: ChessPuzzle }) {
  const { record, rated } = played;
  const chips: string[] = [`puzzle ${puzzle.rating}`];
  if (rated && record.bonus) chips.push(`+${record.bonus} speed`);
  if (rated && hints) chips.push(hints === 1 ? "piece hint · half rating" : "move shown · no rating");
  if (!rated) chips.push("unrated");
  const themes = themeLabels(puzzle);
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-1.5">
        {chips.map((c, i) => (
          <motion.li
            key={c}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: dur.base, ease: ease.spring, delay: 0.15 + i * 0.06 }}
            className="rounded-full bg-white/[0.06] px-2.5 py-1 font-mono text-caption text-chalk"
          >
            {c}
          </motion.li>
        ))}
        {themes.map((t, i) => (
          <motion.li
            key={t}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: dur.base, ease: ease.spring, delay: 0.15 + (chips.length + i) * 0.06 }}
            className="rounded-full px-2.5 py-1 font-mono text-caption text-chalk shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
          >
            {t}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function ShareButton({ puzzle }: { puzzle: ChessPuzzle }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = `${window.location.origin}/play/chess?${challengeQuery({ gameId: "chess", tier: "medium", seed: puzzleSeed(puzzle) })}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
      trackShare("chess", "clipboard");
    } catch {
      window.prompt("Copy this challenge link", url);
      trackShare("chess", "prompt");
    }
  }
  return (
    <Button variant="ghost" arrow={false} onClick={share}>
      {copied ? "copied ✓" : "share"}
    </Button>
  );
}

// ---------------------------------------------------------------- the end of the daily set

function DailySummary({ game, played, history, onExit }: { game: GameMeta; played: Played[]; history: ReturnType<typeof useHistory>; onExit: () => void }) {
  const solved = played.filter((p) => p.record.solved).length;
  const total = played.reduce((n, p) => n + (p.rated ? p.delta : 0), 0);
  const color = hue("chess");
  const data = history ?? getHistory();
  // "Now" is when the last puzzle finished, so the render stays pure.
  const at = played.at(-1)?.record.at ?? 0;
  const today = dayKey(at);
  const done = GAMES.filter((g) => gameSummary(data, g.id, scoringOf(g.id)).dailyDone.has(today)).length;
  const nextDaily = GAMES.find((g) => !gameSummary(data, g.id, scoringOf(g.id)).dailyDone.has(today));
  const streak = overall(data, at).streak;
  const after = played.at(-1)?.ratingAfter ?? 1200;
  const milestone = ratingMilestone(after);
  const line = solved === 3 ? "Three for three." : solved === 2 ? "Two of three. The last one had teeth." : solved === 1 ? "One clean hit." : "Tough set. Tomorrow's another three.";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: dur.slow, ease: ease.springStrong }}
      className="flex flex-1 flex-col gap-5 p-6"
    >
      <p className="flex items-center gap-2 text-caption uppercase tracking-wide text-ash">
        <GameIcon id={game.id} size={22} />
        {game.name} · daily set
      </p>
      <div className="flex flex-col gap-2">
        <span className="font-mono text-number-lg font-bold leading-none">
          {solved}
          <span className="text-ash">/3</span>
        </span>
        <p className="text-heading-sm text-fog">{line}</p>
      </div>

      <ol className="flex flex-col gap-2">
        {played.map((p, i) => (
          <li key={p.puzzle.id} className="well flex items-center justify-between rounded-[14px] px-4 py-3">
            <span className="flex items-center gap-3 font-mono">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-void ${p.record.solved ? "bg-paper" : "bg-ember"}`}>{p.record.solved ? "✓" : "×"}</span>
              <span className="text-chalk">puzzle {i + 1}</span>
              <span className="text-caption text-ash">{p.puzzle.rating}</span>
            </span>
            <span className="font-mono tabular-nums" style={p.rated && p.delta > 0 ? { color } : undefined}>
              {p.rated ? (p.delta === 0 ? "±0" : `${p.delta > 0 ? "+" : ""}${p.delta}`) : "unrated"}
            </span>
          </li>
        ))}
      </ol>

      <div className="well flex flex-col gap-3 rounded-[18px] p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-caption uppercase text-ash">puzzle rating</span>
          <span className="font-mono text-heading-lg">
            {after}{" "}
            <span className={total >= 0 ? "" : "text-ash"} style={total > 0 ? { color } : undefined}>
              {total >= 0 ? "+" : ""}
              {total}
            </span>
          </span>
        </div>
        <TierBar progress={milestone.progress} color={color} delay={0.3} />
        <span className="font-mono text-caption text-ash">
          {milestone.to - after} to {milestone.to} · daily set {done}/{GAMES.length} · {streak}d streak
        </span>
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {nextDaily ? (
          <Link
            href={`/play/${nextDaily.id}?m=daily`}
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-paper px-6 font-mono text-[15px] font-medium text-void transition-colors duration-[var(--dur-fast)] hover:bg-white"
          >
            next daily game
            <span aria-hidden className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:translate-x-1">
              →
            </span>
          </Link>
        ) : (
          <Button onClick={onExit} className="w-full">
            practice chess
          </Button>
        )}
        <Button variant="ghost" arrow={false} onClick={onExit}>
          ← menu
        </Button>
      </div>
    </motion.div>
  );
}
