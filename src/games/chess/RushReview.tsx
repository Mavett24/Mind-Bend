"use client";

/**
 * Reviewing a rush puzzle after the run (D-072). Off the clock and unrecorded: replay the puzzle
 * from its setup move, try as many times as you like, take a hint (the piece, then the move) or
 * watch the solution, then step to the next mistake. Puzzles are pattern recognition, so seeing
 * the line you missed is the part that makes you better.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Square } from "chess.js";
import { dur, ease } from "@/lib/motion";
import { Button } from "@/components/Button";
import { HintButton } from "@/components/HintButton";
import { ChessBoard, type Hint, type Marker } from "./Board";
import { isComplete, judgeMove, parseUci, playerColor, positionAt, themeLabels, type ChessPuzzle, type Move } from "./engine";

const SETUP_DELAY_MS = 550;
const REPLY_DELAY_MS = 420;
const WRONG_HOLD_MS = 700;
const SOLUTION_STEP_MS = 700;
/** Shorter than in play: nothing is at stake here. */
const HINT_COOLDOWN_MS = 1500;

type Phase = "setup" | "play" | "reply" | "solved" | "solution";

export interface ReviewItem {
  puzzle: ChessPuzzle;
  /** Its number in the run, from 1. */
  number: number;
  solved: boolean;
  /** What you played when you missed it. */
  played?: string;
}

interface RushReviewProps {
  item: ReviewItem;
  /** "mistake 2 of 3" when reviewing a miss, null for a puzzle you solved. */
  position: { at: number; of: number } | null;
  /** The next mistake to review, or null when this is the last. */
  hasNext: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function RushReview({ item, position, hasNext, onNext, onBack }: RushReviewProps) {
  const { puzzle } = item;
  const orientation = playerColor(puzzle);

  const [phase, setPhase] = useState<Phase>("setup");
  const [ply, setPly] = useState(0);
  const [display, setDisplay] = useState(() => positionAt(puzzle, 0).fen());
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [marker, setMarker] = useState<Marker | null>(null);
  const [shake, setShake] = useState(0);
  const [hint, setHint] = useState<Hint | null>(null);
  const [hints, setHints] = useState(0);
  const [misses, setMisses] = useState(0);
  const [announce, setAnnounce] = useState("");

  const timers = useRef<number[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => () => clearTimers(), []);

  /** Back to the position you have to solve, with the setup move lit. */
  const toStart = useCallback(
    (animateSetup: boolean) => {
      clearTimers();
      setMarker(null);
      setHint(null);
      const first = parseUci(puzzle.moves[0]);
      const ready = () => {
        setDisplay(positionAt(puzzle, 1).fen());
        setLastMove({ from: first.from, to: first.to });
        setPly(1);
        setPhase("play");
        setAnnounce(`${orientation === "w" ? "White" : "Black"} to move. Find the best move.`);
      };
      if (!animateSetup) return ready();
      setDisplay(positionAt(puzzle, 0).fen());
      setLastMove(null);
      setPly(0);
      setPhase("setup");
      later(ready, SETUP_DELAY_MS);
    },
    [puzzle, orientation, later],
  );

  // The board opens on the position before the setup move (the initial state), then the setup plays.
  useEffect(() => {
    later(() => toStart(false), SETUP_DELAY_MS);
  }, [later, toStart]);

  const onMove = useCallback(
    (move: Move) => {
      if (phase !== "play") return;
      const verdict = judgeMove(puzzle, ply, move);
      if (verdict === "illegal") return;
      const g = positionAt(puzzle, ply);
      const made = g.move({ from: move.from, to: move.to, promotion: move.promotion ?? "q" });
      setDisplay(g.fen());
      setLastMove({ from: made.from, to: made.to });
      setHint(null);

      if (verdict === "wrong") {
        // No fail state here: show it's wrong, then put the position back and let you try again.
        setMarker({ square: made.to, kind: "wrong" });
        setShake((n) => n + 1);
        setMisses((n) => n + 1);
        setPhase("reply");
        setAnnounce(`${made.san} is not it. Try again.`);
        later(() => {
          setDisplay(positionAt(puzzle, ply).fen());
          const prev = parseUci(puzzle.moves[ply - 1]);
          setLastMove({ from: prev.from, to: prev.to });
          setMarker(null);
          setPhase("play");
        }, WRONG_HOLD_MS);
        return;
      }

      setMarker({ square: made.to, kind: "correct" });
      const nextPly = ply + 1;
      if (verdict === "mate" || isComplete(puzzle, nextPly)) {
        setPly(nextPly);
        setPhase("solved");
        setAnnounce(`${made.san}. Solved.`);
        return;
      }
      setPly(nextPly);
      setPhase("reply");
      setAnnounce(`${made.san}. Correct, keep going.`);
      later(() => {
        const reply = parseUci(puzzle.moves[nextPly]);
        setDisplay(positionAt(puzzle, nextPly + 1).fen());
        setLastMove({ from: reply.from, to: reply.to });
        setMarker(null);
        setPly(nextPly + 1);
        setPhase("play");
      }, REPLY_DELAY_MS);
    },
    [phase, puzzle, ply, later],
  );

  const giveHint = () => {
    if (phase !== "play") return;
    const m = parseUci(puzzle.moves[ply]);
    if (!hint) setHint({ from: m.from });
    else if (!hint.to) setHint({ from: m.from, to: m.to });
    else return;
    setHints((n) => n + 1);
  };

  /** Plays the rest of the line from where you are, one move at a time. */
  const showSolution = () => {
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
    setAnnounce("Playing the solution.");
  };

  const done = phase === "solved" || phase === "solution";
  const solutionDone = phase === "solution" && ply >= puzzle.moves.length;
  const themes = themeLabels(puzzle);

  const status =
    phase === "setup"
      ? "setting up"
      : phase === "solved"
        ? hints || misses
          ? "solved. now you know the pattern."
          : "solved. that's the one."
        : phase === "solution"
          ? solutionDone
            ? "that's the line"
            : "the solution"
          : `${orientation === "w" ? "white" : "black"} to move`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: dur.base, ease: ease.out }}
      className="flex flex-1 flex-col gap-3 p-3 sm:p-5"
    >
      <div className="flex items-end justify-between px-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-caption uppercase text-ash">
            review · {position ? `mistake ${position.at} of ${position.of}` : `puzzle ${item.number}`}
          </span>
          <span className="font-num text-heading-sm">
            puzzle {item.number} <span className="text-ash">· {puzzle.rating}</span>
          </span>
        </div>
        {(phase === "play" || phase === "reply" || phase === "setup") && (
          <HintButton onHint={giveHint} count={hints} disabled={phase !== "play" || hint?.to !== undefined} cooldownMs={HINT_COOLDOWN_MS} />
        )}
      </div>

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

      <div className="flex min-h-[148px] flex-col gap-3 px-1">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-2 font-mono text-[15px] text-chalk">
            {done ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-paper text-[10px] font-bold text-void">✓</span>
            ) : (
              <span className={`h-3.5 w-3.5 rounded-full ${orientation === "w" ? "bg-paper" : "bg-[#161616] shadow-[inset_0_0_0_1.5px_var(--color-chalk)]"}`} />
            )}
            {status}
          </p>
          <p className="font-mono text-caption text-ash">
            {!item.solved && item.played ? `in the run you played ${item.played}` : item.solved ? "you solved this one in the run" : "missed in the run"}
            {done && themes.length > 0 && ` · ${themes.join(", ")}`}
          </p>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={done ? "done" : "trying"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.base, ease: ease.out }}
            className="grid grid-cols-[auto_auto_1fr] gap-2"
          >
            <Button variant="ghost" arrow={false} onClick={onBack} className="px-4" aria-label="back to results">
              ←
            </Button>
            {done ? (
              <Button variant="ghost" arrow={false} onClick={() => toStart(true)} className="px-4">
                replay
              </Button>
            ) : (
              <Button variant="ghost" arrow={false} onClick={showSolution} disabled={phase !== "play"} className="px-4">
                solution
              </Button>
            )}
            <Button onClick={hasNext ? onNext : onBack} className="w-full" variant={done ? "primary" : "ghost"}>
              {/* Before you've solved or seen it, moving on is a skip; after, it's the natural next step. */}
              {hasNext ? (done ? "next mistake" : "skip") : "results"}
            </Button>
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </motion.div>
  );
}
