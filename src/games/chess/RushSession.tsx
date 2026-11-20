"use client";

/**
 * Puzzle Rush (D-071), chess.com style: as many puzzles as you can in 3 or 5 minutes. Correct
 * moves score, the third wrong move or the clock ends the run. Puzzles start as mates in one and
 * climb (see rush.ts). No hints, no rating: the score and your best are what's at stake.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Square } from "chess.js";
import type { GameMeta } from "@/games/registry";
import { createRng } from "@/engine/rng";
import { getHistory, newRecordId } from "@/lib/history";
import { sendEvents } from "@/lib/analytics";
import { gameStart, type PlayContext } from "@/lib/events";
import { PlayTracking, recordGame, trackShare, useAbandonOnClose } from "@/lib/track";
import { dur, ease } from "@/lib/motion";
import { Button } from "@/components/Button";
import { GameIcon, hue } from "@/components/GameIcon";
import { useCountUp } from "@/components/TimeDisplay";
import { ChessBoard, type Marker } from "./Board";
import { loadPool } from "./data";
import { isComplete, judgeMove, parseUci, playerColor, positionAt, type ChessPuzzle, type Move } from "./engine";
import { pickRushPuzzle, RUSH_STRIKES, rushBests, rushSeed, rushStep, type RushMinutes } from "./rush";

/** Faster than practice: the clock is running, so the setup and replies don't linger. */
const SETUP_DELAY_MS = 320;
const REPLY_DELAY_MS = 260;
const SOLVED_HOLD_MS = 260;
const WRONG_HOLD_MS = 620;
/** The clock turns ember for the last stretch. */
const LOW_TIME_MS = 10_000;
/** Leaving a run before this counts as nothing at all. */
const QUIT_AFTER_MS = 5000;

const CTX: PlayContext = { game: "chess", tier: "medium", mode: "rush" };

export interface RushSessionProps {
  game: GameMeta;
  minutes: RushMinutes;
  seed: string;
  /** A friend's score to beat, from a shared link. */
  beat?: number | null;
  onExit: () => void;
  onAgain: () => void;
}

type Phase = "loading" | "setup" | "play" | "reply" | "between" | "over" | "error";
type EndReason = "time" | "strikes" | "ended";

interface Attempt {
  puzzle: ChessPuzzle;
  solved: boolean;
}

export function RushSession({ game, minutes, seed, beat, onExit, onAgain }: RushSessionProps) {
  const color = hue("chess");
  const limit = minutes * 60_000;

  const [index, setIndex] = useState(0);
  const [puzzle, setPuzzle] = useState<ChessPuzzle | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [ply, setPly] = useState(0);
  const [display, setDisplay] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [marker, setMarker] = useState<Marker | null>(null);
  const [shake, setShake] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [end, setEnd] = useState<{ reason: EndReason; timeMs: number; previousBest: number | null } | null>(null);
  const [announce, setAnnounce] = useState("");

  const used = useRef(new Set<string>());
  const timers = useRef<number[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => () => clearTimers(), []);

  const score = attempts.filter((a) => a.solved).length;
  const strikes = attempts.length - score;
  const over = end !== null;

  // ------------------------------------------------------------ ending the run

  const runState = useRef({ startedAt, score, strikes, over, attempts });
  useEffect(() => {
    runState.current = { startedAt, score, strikes, over, attempts };
  });

  const finish = useCallback(
    (reason: EndReason) => {
      const s = runState.current;
      if (s.over) return;
      clearTimers();
      const timeMs = s.startedAt === null ? 0 : Math.min(limit, performance.now() - s.startedAt);
      const previousBest = rushBests(getHistory()).best[minutes];
      runState.current = { ...s, over: true };
      recordGame({
        id: newRecordId(),
        at: Date.now(),
        gameId: "chess",
        tier: "medium",
        mode: "rush",
        seed: rushSeed(minutes, seed),
        timeMs,
        solved: true,
        score: s.score,
      });
      setEnd({ reason, timeMs, previousBest });
      setPhase("over");
      setAnnounce(`Run over. ${s.score} solved.`);
    },
    [limit, minutes, seed],
  );

  // Leaving mid-run (abort, close, back): a quit, kept for your activity, never a best.
  useEffect(() => {
    return () => {
      const s = runState.current;
      if (s.over || s.startedAt === null) return;
      const timeMs = performance.now() - s.startedAt;
      if (timeMs < QUIT_AFTER_MS) return;
      recordGame({ id: newRecordId(), at: Date.now(), gameId: "chess", tier: "medium", mode: "rush", seed: rushSeed(minutes, seed), timeMs, solved: false, quit: true, score: s.score });
    };
  }, [minutes, seed]);

  useAbandonOnClose(() => {
    const s = runState.current;
    return s.over || s.startedAt === null ? null : { ctx: CTX, startedAt: s.startedAt };
  }, QUIT_AFTER_MS);

  // The clock: ticks while the run is live, ends it at zero.
  useEffect(() => {
    if (startedAt === null || over) return;
    const id = window.setInterval(() => {
      const t = performance.now();
      setNow(t);
      if (t - startedAt >= limit) finish("time");
    }, 100);
    return () => clearInterval(id);
  }, [startedAt, over, limit, finish]);

  const remaining = over ? Math.max(0, limit - (end?.timeMs ?? limit)) : startedAt === null ? limit : Math.max(0, limit - (now - startedAt));

  // ------------------------------------------------------------ loading each puzzle

  useEffect(() => {
    if (over) return;
    let live = true;
    (async () => {
      const step = rushStep(index);
      const pool = await loadPool(step.target);
      // Warm the bands a couple of puzzles ahead so the next one is instant.
      void loadPool(rushStep(index + 3).target).catch(() => {});
      if (!live || runState.current.over) return;
      const p = pickRushPuzzle(pool, step, createRng(`rush:${seed}:${index}`), used.current);
      used.current.add(p.id);
      setPuzzle(p);
      setPly(0);
      setDisplay(positionAt(p, 0).fen());
      setLastMove(null);
      setMarker(null);
      setPhase("setup");
      later(() => {
        const first = parseUci(p.moves[0]);
        setDisplay(positionAt(p, 1).fen());
        setLastMove({ from: first.from, to: first.to });
        setPly(1);
        setPhase("play");
        if (index === 0) {
          setStartedAt(performance.now());
          sendEvents(gameStart(CTX));
        }
        setAnnounce(`Puzzle ${index + 1}. ${playerColor(p) === "w" ? "White" : "Black"} to move.`);
      }, index === 0 ? SETUP_DELAY_MS + 200 : SETUP_DELAY_MS);
    })().catch(() => live && setPhase("error"));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a new puzzle only when the index moves
  }, [index]);

  const nextPuzzle = useCallback(() => {
    if (runState.current.over) return;
    setPhase("between");
    setIndex((i) => i + 1);
  }, []);

  // ------------------------------------------------------------ moves

  const onMove = useCallback(
    (move: Move) => {
      if (!puzzle || phase !== "play" || over) return;
      const verdict = judgeMove(puzzle, ply, move);
      if (verdict === "illegal") return;
      const g = positionAt(puzzle, ply);
      const made = g.move({ from: move.from, to: move.to, promotion: move.promotion ?? "q" });
      setDisplay(g.fen());
      setLastMove({ from: made.from, to: made.to });
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(verdict === "wrong" ? [20, 40, 20] : 8);

      if (verdict === "wrong") {
        setMarker({ square: made.to, kind: "wrong" });
        setShake((n) => n + 1);
        setPhase("between");
        const strikesNow = strikes + 1;
        setAttempts((a) => [...a, { puzzle, solved: false }]);
        setAnnounce(`${made.san} is not the move. ${RUSH_STRIKES - strikesNow} ${RUSH_STRIKES - strikesNow === 1 ? "life" : "lives"} left.`);
        later(() => (strikesNow >= RUSH_STRIKES ? finish("strikes") : nextPuzzle()), WRONG_HOLD_MS);
        return;
      }

      setMarker({ square: made.to, kind: "correct" });
      const nextPly = ply + 1;
      if (verdict === "mate" || isComplete(puzzle, nextPly)) {
        setPly(nextPly);
        setPhase("between");
        setAttempts((a) => [...a, { puzzle, solved: true }]);
        setAnnounce(`${made.san}. Solved, ${score + 1}.`);
        later(nextPuzzle, SOLVED_HOLD_MS);
        return;
      }
      setPly(nextPly);
      setPhase("reply");
      later(() => {
        const reply = parseUci(puzzle.moves[nextPly]);
        setDisplay(positionAt(puzzle, nextPly + 1).fen());
        setLastMove({ from: reply.from, to: reply.to });
        setMarker(null);
        setPly(nextPly + 1);
        setPhase("play");
      }, REPLY_DELAY_MS);
    },
    [puzzle, phase, over, ply, strikes, score, later, finish, nextPuzzle],
  );

  // ------------------------------------------------------------ render

  if (over && end) {
    return (
      <RushSummary game={game} minutes={minutes} seed={seed} attempts={attempts} reason={end.reason} previousBest={end.previousBest} beat={beat ?? null} onExit={onExit} onAgain={onAgain} />
    );
  }

  const orientation = puzzle ? playerColor(puzzle) : "w";
  const low = startedAt !== null && remaining <= LOW_TIME_MS;

  return (
    <PlayTracking.Provider value={CTX}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: dur.base, ease: ease.out }}
        className="flex flex-1 flex-col gap-3 p-3 sm:p-5"
      >
        {/* Score, lives, clock. */}
        <div className="flex items-end justify-between px-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-caption uppercase text-ash">
              rush · {minutes} min{beat ? ` · beat ${beat}` : ""}
            </span>
            <ScoreNumber value={score} color={color} />
          </div>
          <Lives strikes={strikes} />
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-caption uppercase text-ash">time</span>
            <span className={`font-num text-heading-lg tabular-nums ${low ? "text-ember" : ""}`} aria-label={`${Math.ceil(remaining / 1000)} seconds left`}>
              {fmtClock(remaining)}
            </span>
          </div>
        </div>

        <ResultStrip attempts={attempts} color={color} />

        <div className="relative">
          {display ? (
            <ChessBoard
              fen={display}
              orientation={orientation}
              lastMove={lastMove}
              movable={phase === "play" ? orientation : null}
              onMove={onMove}
              marker={marker}
              shake={shake}
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-control bg-void shadow-[0_0_0_1px_rgba(255,255,255,0.07)]">
              {phase === "error" ? (
                <div className="flex flex-col items-center gap-3 px-6 text-center text-fog">
                  <p>The puzzles couldn&apos;t load. Check your connection.</p>
                  <Button variant="ghost" arrow={false} onClick={onExit}>
                    ← menu
                  </Button>
                </div>
              ) : (
                <p className="animate-pulse font-mono text-caption uppercase text-fog">loading puzzles</p>
              )}
            </div>
          )}
        </div>

        <div className="flex min-h-[72px] items-start justify-between gap-3 px-1">
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-2 font-mono text-[15px] text-chalk">
              <span className={`h-3.5 w-3.5 rounded-full ${orientation === "w" ? "bg-paper" : "bg-[#161616] shadow-[inset_0_0_0_1.5px_var(--color-chalk)]"}`} />
              {phase === "loading" || (phase === "setup" && index === 0) ? "get ready" : `${orientation === "w" ? "white" : "black"} to move`}
            </p>
            <p className="font-mono text-caption text-ash">
              puzzle {index + 1}
              {puzzle ? ` · ${puzzle.rating}` : ""}
            </p>
          </div>
          {startedAt !== null && (
            <Button variant="ghost" arrow={false} onClick={() => finish("ended")} className="h-10 px-4 text-[13px]">
              end run
            </Button>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </motion.div>
    </PlayTracking.Provider>
  );
}

// ---------------------------------------------------------------- pieces of the run screen

const fmtClock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** The score, ticking up with a small spring each time it changes. */
function ScoreNumber({ value, color }: { value: number; color: string }) {
  const reduced = useReducedMotion();
  return (
    <span className="relative h-[34px] overflow-hidden font-num text-heading-lg leading-[34px]">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="block"
          initial={reduced ? false : { y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduced ? undefined : { y: -18, opacity: 0 }}
          transition={{ duration: dur.base, ease: ease.spring }}
          style={value > 0 ? { color } : undefined}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Three lives: each wrong move crosses one out. */
function Lives({ strikes }: { strikes: number }) {
  return (
    <div className="flex items-center gap-1.5 pb-1.5" role="img" aria-label={`${RUSH_STRIKES - strikes} of ${RUSH_STRIKES} lives left`}>
      {Array.from({ length: RUSH_STRIKES }, (_, i) => {
        const lost = i < strikes;
        return (
          <motion.span
            key={i}
            initial={false}
            animate={{ scale: lost ? [1.35, 1] : 1 }}
            transition={{ duration: dur.base, ease: ease.spring }}
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${lost ? "bg-ember text-void" : "bg-white/[0.06] text-steel shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"}`}
          >
            ×
          </motion.span>
        );
      })}
    </div>
  );
}

/** One tile per puzzle played, newest on the right: hue for a solve, ember for a miss. */
function ResultStrip({ attempts, color }: { attempts: Attempt[]; color: string }) {
  const shown = attempts.slice(-16);
  return (
    <div className="flex h-6 items-center justify-end gap-1 overflow-hidden px-1" aria-hidden>
      {attempts.length === 0 && <span className="mr-auto font-mono text-caption text-steel">mates first, then it climbs</span>}
      <AnimatePresence initial={false}>
        {shown.map((a) => (
          <motion.span
            key={a.puzzle.id}
            layout="position"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: dur.base, ease: ease.spring }}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] text-[10px] font-bold text-void ${a.solved ? "" : "bg-ember"}`}
            style={a.solved ? { background: color } : undefined}
          >
            {a.solved ? "✓" : "×"}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------- the end of a run

const REASON: Record<EndReason, string> = { time: "time's up", strikes: "three strikes", ended: "run ended" };

interface SummaryProps {
  game: GameMeta;
  minutes: RushMinutes;
  seed: string;
  attempts: Attempt[];
  reason: EndReason;
  previousBest: number | null;
  beat: number | null;
  onExit: () => void;
  onAgain: () => void;
}

function RushSummary({ game, minutes, seed, attempts, reason, previousBest, beat, onExit, onAgain }: SummaryProps) {
  const color = hue("chess");
  const score = attempts.filter((a) => a.solved).length;
  const shown = Math.round(useCountUp(score, 900));
  const hardest = attempts.filter((a) => a.solved).reduce<number | null>((m, a) => Math.max(m ?? 0, a.puzzle.rating), null);
  const newBest = score > 0 && (previousBest === null || score > previousBest);
  const line = useMemo(() => {
    if (beat !== null) return score > beat ? `You beat ${beat}.` : score === beat ? `Level with ${beat}.` : score === 0 ? `${beat} still to beat.` : `${beat - score} short of ${beat}.`;
    if (newBest) return previousBest === null ? "First run on the board." : `New best, up from ${previousBest}.`;
    if (previousBest !== null) return `Best is ${previousBest}.`;
    return "Every run starts at mate in one.";
  }, [beat, score, newBest, previousBest]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: dur.slow, ease: ease.springStrong }}
      className="flex flex-1 flex-col gap-5 p-6"
    >
      <p className="flex items-center gap-2 text-caption uppercase text-ash">
        <GameIcon id={game.id} size={22} />
        {game.name} · puzzle rush · {minutes} min
      </p>

      <div className="flex flex-col gap-2">
        <span className="flex items-baseline gap-3">
          <span className="font-num text-number-lg leading-none" style={score > 0 ? { color } : undefined}>
            {shown}
          </span>
          <span className="font-mono text-caption uppercase text-ash">solved · {REASON[reason]}</span>
        </span>
        <p className="text-heading-sm text-fog">{line}</p>
      </div>

      <div className="well grid grid-cols-3 gap-3 rounded-[18px] p-4">
        <SummaryStat label="best" value={String(Math.max(score, previousBest ?? 0))} />
        <SummaryStat label="missed" value={`${attempts.length - score}/${RUSH_STRIKES}`} />
        <SummaryStat label="hardest" value={hardest === null ? "--" : String(hardest)} />
      </div>

      {attempts.length > 0 && (
        <ol className="flex flex-wrap gap-1.5" aria-label="Puzzles in this run">
          {attempts.map((a, i) => (
            <motion.li
              key={a.puzzle.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: dur.base, ease: ease.spring, delay: Math.min(0.6, 0.2 + i * 0.02) }}
              className={`flex h-7 items-center gap-1 rounded-full px-2 font-mono text-caption tabular-nums ${a.solved ? "bg-white/[0.06] text-chalk" : "text-ember shadow-[inset_0_0_0_1px_var(--color-ember)]"}`}
              title={a.solved ? "solved" : "missed"}
            >
              <span aria-hidden>{a.solved ? "✓" : "×"}</span>
              {a.puzzle.rating}
            </motion.li>
          ))}
        </ol>
      )}

      <div className="mt-auto flex flex-col gap-3">
        <Button onClick={onAgain} className="w-full">
          rush again
        </Button>
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <Button variant="ghost" arrow={false} onClick={onExit} aria-label="menu">
            ←
          </Button>
          <ShareRun minutes={minutes} seed={seed} score={score} />
        </div>
      </div>
    </motion.div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-caption uppercase text-ash">{label}</span>
      <span className="font-num text-heading-sm">{value}</span>
    </div>
  );
}

/** A link to the same run (same puzzles, same order) with your score to beat. */
function ShareRun({ minutes, seed, score }: { minutes: RushMinutes; seed: string; score: number }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = `${window.location.origin}/play/chess?${new URLSearchParams({ m: "rush", r: String(minutes), s: seed, b: String(score) })}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
      trackShare("chess", "clipboard");
    } catch {
      window.prompt("Copy this link", url);
      trackShare("chess", "prompt");
    }
  }
  return (
    <Button variant="ghost" arrow={false} onClick={share} className="w-full">
      {copied ? "copied ✓" : "challenge a friend"}
    </Button>
  );
}
