"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { BoardProps } from "@/games/types";
import { Button } from "@/components/Button";
import { CountUpPoints } from "@/components/TimeDisplay";
import { dur, ease } from "@/lib/motion";
import { oklchToHex, type Oklch } from "./color";
import { finalScore, PICKER, ROUNDS, scoreGuess, type RecallPuzzle } from "./engine";

type Phase = "show" | "recall" | "reveal";

/** Per-round lines from docs/games/recall.md. */
function roundLine(points: number): string {
  if (points >= 9.5) return "Photographic. Suspiciously so.";
  if (points >= 8) return "Sharp eye.";
  if (points >= 6) return "Close enough to argue about.";
  if (points >= 4) return "Same family. Different cousin.";
  return "That was a colour. Not the colour.";
}

/** Text that stays readable on any stimulus colour. */
const inkFor = (c: Oklch) => (c.l > 0.7 ? "text-void" : "text-paper");

const LAYOUT: Record<number, string> = {
  1: "grid-cols-1 grid-rows-1",
  2: "grid-cols-1 grid-rows-2",
  3: "grid-cols-1 grid-rows-3",
  4: "grid-cols-2 grid-rows-2",
};

function Countdown({ ms, onDone, colour }: { ms: number; onDone: () => void; colour: Oklch }) {
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
    <div className={`pointer-events-none absolute right-4 top-3 text-right ${inkFor(colour)}`}>
      <p className="font-mono text-display font-bold tabular-nums leading-none">
        {whole}
        <span className="opacity-50">.{fraction}</span>
      </p>
      <p className="mt-1 text-caption">to remember</p>
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

/** Press, hold and drag (DESIGN.md: commit press). Arrow keys nudge. */
function Slider({ label, value, min, max, step, gradient, onChange }: SliderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const fromPointer = (e: React.PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onChange(min + t * (max - min));
  };
  const t = (value - min) / (max - min);
  return (
    <div className="flex items-center gap-3">
      <span className="w-4 text-caption uppercase text-steel">{label}</span>
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label={{ h: "hue", c: "chroma", l: "lightness" }[label] ?? label}
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
        className="relative h-9 flex-1 cursor-pointer touch-none rounded-full outline-none focus-visible:ring-1 focus-visible:ring-paper"
        style={{ background: gradient }}
      >
        <span
          className="pointer-events-none absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
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
  const [phase, setPhase] = useState<Phase>("show");
  const [points, setPoints] = useState<number[]>([]);
  const round = puzzle.rounds[roundIndex];
  const [guess, setGuess] = useState<Oklch>(round.starts[0]);
  const [last, setLast] = useState<{ points: number; deltaE: number } | null>(null);
  const finished = useRef(false);

  const target = round.targets[targetIndex];
  const gradients = useMemo(
    () => ({ h: gradientFor(guess, "h"), c: gradientFor(guess, "c"), l: gradientFor(guess, "l") }),
    [guess],
  );

  function lockIn() {
    const result = scoreGuess(round.tiles[target], guess);
    setPoints((p) => [...p, result.points]);
    setLast(result);
    setPhase("reveal");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(10);
  }

  const isLastTarget = targetIndex === round.targets.length - 1;
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
      setPhase("show");
    } else if (!finished.current) {
      finished.current = true;
      onSolved({ points: finalScore(points), extra: { label: "best colour", value: Math.max(...points) } });
    }
  }

  const tileCount = round.tiles.length;

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-control bg-graphite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${roundIndex}-${phase}-${targetIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.base, ease: ease.out }}
            className={`absolute inset-0 grid ${LAYOUT[tileCount]} ${tileCount > 1 ? "gap-[3px]" : ""}`}
          >
            {round.tiles.map((tile, i) => {
              const isTarget = i === target;
              if (phase === "show") return <div key={i} style={{ background: oklchToHex(tile) }} />;
              if (phase === "recall") {
                return (
                  <div
                    key={i}
                    className={`relative flex items-center justify-center ${isTarget ? "" : "bg-graphite"}`}
                    style={isTarget ? { background: oklchToHex(guess) } : undefined}
                  >
                    {isTarget ? (
                      <span className={`text-caption uppercase tracking-wide ${inkFor(guess)}`}>rebuild this</span>
                    ) : (
                      <span className="text-caption text-steel">·</span>
                    )}
                  </div>
                );
              }
              // reveal: split the target tile, yours on top, the original below (DESIGN.md §6, moment 5)
              if (!isTarget) return <div key={i} style={{ background: oklchToHex(tile) }} className="opacity-40" />;
              return (
                <div key={i} className="relative grid grid-rows-2">
                  <motion.div
                    initial={{ y: "50%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: dur.slow, ease: ease.out }}
                    className="relative"
                    style={{ background: oklchToHex(guess) }}
                  >
                    <span className={`absolute bottom-2 left-3 text-caption ${inkFor(guess)}`}>yours</span>
                  </motion.div>
                  <motion.div
                    initial={{ y: "-50%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: dur.slow, ease: ease.out }}
                    className="relative"
                    style={{ background: oklchToHex(tile) }}
                  >
                    <span className={`absolute bottom-2 left-3 text-caption ${inkFor(tile)}`}>original</span>
                  </motion.div>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        <span
          className={`pointer-events-none absolute left-4 top-3 z-10 text-caption ${
            phase === "show" ? inkFor(round.tiles[0]) : phase === "reveal" && tileCount === 1 ? inkFor(guess) : "text-steel"
          }`}
        >
          {roundIndex + 1} / {ROUNDS}
        </span>
        {phase === "show" && (
          <Countdown key={roundIndex} ms={puzzle.displayMs} colour={round.tiles[tileCount === 4 ? 1 : 0]} onDone={() => setPhase("recall")} />
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {phase === "recall" && (
          <motion.div
            key="picker"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.base, ease: ease.out }}
            className="flex flex-col gap-3"
          >
            <Slider label="h" value={guess.h} min={PICKER.h[0]} max={PICKER.h[1]} step={3} gradient={gradients.h} onChange={(h) => setGuess((g) => ({ ...g, h }))} />
            <Slider label="c" value={guess.c} min={PICKER.c[0]} max={PICKER.c[1]} step={0.005} gradient={gradients.c} onChange={(c) => setGuess((g) => ({ ...g, c }))} />
            <Slider label="l" value={guess.l} min={PICKER.l[0]} max={PICKER.l[1]} step={0.01} gradient={gradients.l} onChange={(l) => setGuess((g) => ({ ...g, l }))} />
            <Button onClick={lockIn} className="mt-1 w-full">
              lock in
            </Button>
          </motion.div>
        )}
        {phase === "reveal" && last && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.base, ease: ease.out }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-end justify-between">
              <CountUpPoints points={last.points} className="text-number font-bold" />
              <span className="pb-2 text-caption text-steel">ΔE {last.deltaE.toFixed(1)}</span>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: dur.base, delay: dur.count }}
              className="text-heading-sm text-fog"
            >
              {roundLine(last.points)}
            </motion.p>
            <Button onClick={advance} className="w-full">
              {!isLastTarget ? "next colour" : !isLastRound ? "next round" : "see score"}
            </Button>
          </motion.div>
        )}
        {phase === "show" && (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-fog"
          >
            {tileCount === 1 ? "Remember this colour." : tileCount === 2 ? "Remember both colours and where they are." : `Remember all ${tileCount} colours and where they are.`}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
