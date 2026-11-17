"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { BoardProps } from "@/games/types";
import { Button } from "@/components/Button";
import { CountUpPoints } from "@/components/TimeDisplay";
import { dur, ease } from "@/lib/motion";
import { oklchToHex, type Oklch } from "./color";
import { finalScore, PICKER, ROUNDS, scoreGuess, type RecallPuzzle } from "./engine";

/**
 * Game opens on a ready step (what's coming). Each round: show (memorise) → recall (rebuild) → reveal (compare).
 * Expert rebuilds two tiles per round: recall → reveal → recall → reveal.
 */
type Phase = "ready" | "show" | "recall" | "reveal";

/** Per-round lines from docs/games/recall.md. */
function roundLine(points: number): string {
  if (points >= 9.5) return "Photographic. Suspiciously so.";
  if (points >= 8) return "Sharp eye.";
  if (points >= 6) return "Close enough to argue about.";
  if (points >= 4) return "Same family. Different cousin.";
  return "That was a colour. Not the colour.";
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const LAYOUT: Record<number, string> = {
  1: "grid-cols-1 grid-rows-1",
  2: "grid-cols-1 grid-rows-2",
  3: "grid-cols-1 grid-rows-3",
  4: "grid-cols-2 grid-rows-2",
};

/** A small dark pill, readable on any stimulus colour. */
function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`rounded-full bg-void/70 px-2.5 py-1 font-mono text-caption text-paper backdrop-blur-sm ${className}`}>{children}</span>;
}

function Countdown({ ms, onDone }: { ms: number; onDone: () => void }) {
  const [left, setLeft] = useState(ms);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const remaining = Math.max(0, ms - (now - start));
      setLeft(remaining);
      if (remaining > 0) frame = requestAnimationFrame(tick);
      else done.current();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ms]);
  const [whole, fraction] = (left / 1000).toFixed(2).split(".");
  return (
    <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col items-end gap-1 rounded-control bg-void/70 px-3 py-2 backdrop-blur-sm">
      <p className="font-mono text-heading-lg font-medium tabular-nums leading-none text-paper">
        {whole}
        <span className="text-ash">.{fraction}</span>
      </p>
      <p className="text-caption text-fog">to remember</p>
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  gradient: string;
  onChange: (v: number) => void;
}

/** Press anywhere on the track and drag. Arrow keys nudge. */
function Slider({ label, value, min, max, step, gradient, onChange }: SliderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const fromPointer = (e: React.PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (e.clientX - 14 - rect.left) / (rect.width - 28)));
    onChange(min + t * (max - min));
  };
  const t = (value - min) / (max - min);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption uppercase text-steel">{label}</span>
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.round(value * 1000) / 1000}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons || e.pressure > 0) fromPointer(e);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") onChange(Math.min(max, value + step));
          else if (e.key === "ArrowLeft" || e.key === "ArrowDown") onChange(Math.max(min, value - step));
          else return;
          e.preventDefault();
        }}
        className="relative h-10 cursor-pointer touch-none rounded-full outline-none focus-visible:ring-1 focus-visible:ring-paper"
        style={{ background: gradient }}
      >
        <span
          className="pointer-events-none absolute top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-paper shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
          style={{ left: `calc(14px + ${t} * (100% - 28px))` }}
        />
      </div>
    </div>
  );
}

function gradientFor(base: Oklch, key: "h" | "c" | "l"): string {
  const [min, max] = PICKER[key];
  const stops = Array.from({ length: 13 }, (_, i) => oklchToHex({ ...base, [key]: min + ((max - min) * i) / 12 }));
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

export function RecallBoard({ puzzle, onSolved }: BoardProps<RecallPuzzle>) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [points, setPoints] = useState<number[]>([]);
  const round = puzzle.rounds[roundIndex];
  const [guess, setGuess] = useState<Oklch>(round.starts[0]);
  const [last, setLast] = useState<{ points: number; deltaE: number } | null>(null);
  const finished = useRef(false);

  const tileCount = round.tiles.length;
  const toRebuild = round.targets.length;
  const target = round.targets[targetIndex];
  const seconds = puzzle.displayMs / 1000;
  const gradients = useMemo(() => ({ h: gradientFor(guess, "h"), c: gradientFor(guess, "c"), l: gradientFor(guess, "l") }), [guess]);
  const perRound = useMemo(() => {
    // Average per round, for the progress dots.
    const out: number[] = [];
    let k = 0;
    for (const r of puzzle.rounds) {
      const slice = points.slice(k, k + r.targets.length);
      if (slice.length === r.targets.length) out.push(finalScore(slice));
      k += r.targets.length;
    }
    return out;
  }, [points, puzzle.rounds]);

  function lockIn() {
    const result = scoreGuess(round.tiles[target], guess);
    setPoints((p) => [...p, result.points]);
    setLast(result);
    setPhase("reveal");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(10);
  }

  const isLastTarget = targetIndex === toRebuild - 1;
  const isLastRound = roundIndex === ROUNDS - 1;

  function advance() {
    if (!isLastTarget) {
      setTargetIndex(targetIndex + 1);
      setGuess(round.starts[targetIndex + 1]);
      setPhase("recall");
    } else if (!isLastRound) {
      const next = puzzle.rounds[roundIndex + 1];
      setRoundIndex(roundIndex + 1);
      setTargetIndex(0);
      setGuess(next.starts[0]);
      // The ready step only opens the game; later rounds start straight away.
      setPhase("show");
    } else if (!finished.current) {
      finished.current = true;
      onSolved({ points: finalScore(points), extra: { label: "best colour", value: Math.max(...points) } });
    }
  }

  const task =
    tileCount === 1
      ? "Remember this colour."
      : `Remember ${tileCount === 2 ? "both" : `all ${tileCount}`} colours and where each one is. You'll rebuild ${toRebuild === 1 ? "one" : "two"}.`;

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-4">
      {/* Round progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5" aria-label={`round ${roundIndex + 1} of ${ROUNDS}`}>
          {Array.from({ length: ROUNDS }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-[var(--dur-base)] ${
                i < perRound.length ? "w-6 bg-paper" : i === roundIndex ? "w-6 bg-ember" : "w-3 bg-iron"
              }`}
            />
          ))}
        </div>
        <span className="font-mono text-caption uppercase text-steel">
          round {roundIndex + 1} / {ROUNDS}
          {toRebuild > 1 && phase !== "ready" && phase !== "show" ? ` · colour ${targetIndex + 1} of ${toRebuild}` : ""}
        </span>
      </div>

      {/* Stage */}
      <div className="relative aspect-square w-full overflow-hidden rounded-control bg-void p-1.5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${roundIndex}-${phase}-${targetIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.base, ease: ease.out }}
            className={`grid h-full w-full gap-1.5 ${LAYOUT[tileCount]}`}
          >
            {round.tiles.map((tile, i) => {
              const isTarget = i === target;
              const shape = "relative flex items-center justify-center overflow-hidden rounded-cell";

              if (phase === "ready") {
                return <div key={i} className={`${shape} border-2 border-dashed border-iron`} />;
              }
              if (phase === "show") {
                return <div key={i} className={shape} style={{ background: oklchToHex(tile) }} />;
              }
              if (phase === "recall") {
                return isTarget ? (
                  <div key={i} className={`${shape} ring-2 ring-paper ring-inset`} style={{ background: oklchToHex(guess) }}>
                    <Pill>rebuild this one</Pill>
                  </div>
                ) : (
                  <div key={i} className={`${shape} border-2 border-dashed border-iron`} />
                );
              }
              // reveal: the target splits, yours on top, original below. Others come back so you see what you held.
              if (!isTarget) return <div key={i} className={`${shape} opacity-50`} style={{ background: oklchToHex(tile) }} />;
              return (
                <div key={i} className="relative grid grid-rows-2 overflow-hidden rounded-cell">
                  <motion.div initial={{ y: "50%" }} animate={{ y: 0 }} transition={{ duration: dur.slow, ease: ease.out }} className="relative" style={{ background: oklchToHex(guess) }}>
                    <Pill className="absolute bottom-2 left-2">yours</Pill>
                  </motion.div>
                  <motion.div initial={{ y: "-50%" }} animate={{ y: 0 }} transition={{ duration: dur.slow, ease: ease.out }} className="relative" style={{ background: oklchToHex(tile) }}>
                    <Pill className="absolute bottom-2 left-2">original</Pill>
                  </motion.div>
                  <span aria-hidden className="pointer-events-none absolute inset-0 rounded-cell ring-2 ring-inset ring-paper" />
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {phase === "ready" && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-1 rounded-control bg-carbon px-6 py-4 text-center">
              <p className="font-mono text-heading-lg font-medium">{plural(tileCount, "colour")}</p>
              <p className="text-fog">shown for {seconds} seconds</p>
            </div>
          </div>
        )}
        {phase === "show" && <Countdown key={roundIndex} ms={puzzle.displayMs} onDone={() => setPhase("recall")} />}
      </div>

      {/* Controls */}
      <AnimatePresence mode="wait" initial={false}>
        {phase === "ready" && (
          <motion.div key="ready" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: dur.base, ease: ease.out }} className="flex flex-col gap-3">
            <p className="text-fog">{task}</p>
            <Button onClick={() => setPhase("show")} className="w-full" autoFocus>
              show {tileCount === 1 ? "the colour" : "the colours"}
            </Button>
          </motion.div>
        )}
        {phase === "show" && (
          <motion.p key="show" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-fog">
            {task}
          </motion.p>
        )}
        {phase === "recall" && (
          <motion.div key={`picker-${targetIndex}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: dur.base, ease: ease.out }} className="flex flex-col gap-3">
            <p className="text-fog">
              {tileCount === 1 ? "Rebuild the colour you saw." : "Rebuild the colour that was in the highlighted spot."}
            </p>
            <Slider label="hue" value={guess.h} min={PICKER.h[0]} max={PICKER.h[1]} step={3} gradient={gradients.h} onChange={(h) => setGuess((g) => ({ ...g, h }))} />
            <Slider label="vividness" value={guess.c} min={PICKER.c[0]} max={PICKER.c[1]} step={0.005} gradient={gradients.c} onChange={(c) => setGuess((g) => ({ ...g, c }))} />
            <Slider label="brightness" value={guess.l} min={PICKER.l[0]} max={PICKER.l[1]} step={0.01} gradient={gradients.l} onChange={(l) => setGuess((g) => ({ ...g, l }))} />
            <Button onClick={lockIn} className="mt-1 w-full">
              lock in
            </Button>
          </motion.div>
        )}
        {phase === "reveal" && last && (
          <motion.div key={`reveal-${targetIndex}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: dur.base, ease: ease.out }} className="flex flex-col gap-3">
            <div className="flex items-end justify-between">
              <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                <CountUpPoints points={last.points} className="text-number" />
                <span className="font-mono text-heading-sm text-steel">/10</span>
              </span>
              <span className="pb-2 text-right text-caption text-steel">
                difference {last.deltaE.toFixed(1)}
                <br />
                (0 is perfect)
              </span>
            </div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: dur.base, delay: dur.count }} className="text-heading-sm text-fog">
              {roundLine(last.points)}
            </motion.p>
            <Button onClick={advance} className="w-full" autoFocus>
              {!isLastTarget ? "rebuild the next one" : !isLastRound ? "next round" : "see score"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
