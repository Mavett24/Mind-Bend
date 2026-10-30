"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { BoardProps } from "@/games/types";
import { Button } from "@/components/Button";
import { dur, ease } from "@/lib/motion";
import { BLOCKS_PALETTE } from "@/games/blocks/palette";
import { adjacent8, judgeTrace, wordOf, type WeavePuzzle } from "./engine";

/** A finger only "enters" a cell near its centre, so diagonal moves don't clip the corner cells. */
const HIT_RADIUS = 0.42;

type Message = { text: string; tone: "good" | "info" | "bad" } | null;

export function WeaveBoard({ puzzle, onSolved }: BoardProps<WeavePuzzle>) {
  const { size, letters, words } = puzzle;
  const [found, setFound] = useState<number[]>([]);
  const [trace, setTrace] = useState<number[]>([]);
  const [message, setMessage] = useState<Message>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [hints, setHints] = useState<Record<number, number>>({});
  const [cursor, setCursor] = useState(0);
  const [solved, setSolved] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const traceRef = useRef<number[]>([]);
  const reduced = useReducedMotion();

  const foundSet = useMemo(() => new Set(found), [found]);
  const ownerOf = useMemo(() => {
    const owner = new Array<number>(size * size).fill(-1);
    found.forEach((wi) => words[wi].cells.forEach((c) => (owner[c] = wi)));
    return owner;
  }, [found, size, words]);
  const hintCount = Object.values(hints).reduce((a, b) => a + b, 0);

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), 1600);
    return () => clearTimeout(id);
  }, [message]);

  const setTraceBoth = (t: number[]) => {
    traceRef.current = t;
    setTrace(t);
  };

  const extend = (cell: number) => {
    const t = traceRef.current;
    if (ownerOf[cell] >= 0) return;
    if (t.length === 0) return setTraceBoth([cell]);
    const head = t[t.length - 1];
    if (cell === head) return;
    if (t.length >= 2 && cell === t[t.length - 2]) return setTraceBoth(t.slice(0, -1));
    if (!t.includes(cell) && adjacent8(size, head, cell)) {
      setTraceBoth([...t, cell]);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(4);
    }
  };

  const submit = () => {
    const t = traceRef.current;
    setTraceBoth([]);
    if (t.length === 0) return;
    const result = judgeTrace(puzzle, t, foundSet);
    if (result.kind === "found") {
      const next = [...found, result.index];
      setFound(next);
      setMessage({ text: words[result.index].word, tone: "good" });
      if (next.length === words.length) {
        setSolved(true);
        onSolved({ extra: { label: "hints", value: hintCount } });
      }
    } else if (result.kind === "elsewhere") {
      setMessage({ text: `${wordOf(puzzle, t)}: a word, but not hidden here`, tone: "info" });
    } else if (result.kind === "invalid") {
      setMessage({ text: `${wordOf(puzzle, t)}: not a word`, tone: "bad" });
      setShakeKey((k) => k + 1);
    } else if (result.kind === "short") {
      if (t.length > 1) setMessage({ text: "three letters or more", tone: "info" });
    }
  };

  const cellFromPointer = (e: React.PointerEvent): number | null => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = ((e.clientX - rect.left) / rect.width) * size;
    const y = ((e.clientY - rect.top) / rect.height) * size;
    const c = Math.floor(x);
    const r = Math.floor(y);
    if (c < 0 || r < 0 || c >= size || r >= size) return null;
    if (Math.hypot(x - (c + 0.5), y - (r + 0.5)) > HIT_RADIUS) return null;
    return r * size + c;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (solved) return;
    const cell = cellFromPointer(e);
    if (cell === null || ownerOf[cell] >= 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    setTraceBoth([cell]);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const cell = cellFromPointer(e);
    if (cell !== null) extend(cell);
  };
  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    submit();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (solved) return;
    const r = Math.floor(cursor / size);
    const c = cursor % size;
    const moves: Record<string, number | null> = {
      ArrowUp: r > 0 ? cursor - size : null,
      ArrowDown: r < size - 1 ? cursor + size : null,
      ArrowLeft: c > 0 ? cursor - 1 : null,
      ArrowRight: c < size - 1 ? cursor + 1 : null,
    };
    if (e.key in moves) {
      e.preventDefault();
      const t = moves[e.key];
      if (t !== null) setCursor(t);
    } else if (e.key === " ") {
      e.preventDefault();
      extend(cursor);
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Backspace") {
      e.preventDefault();
      setTraceBoth(traceRef.current.slice(0, -1));
    } else if (e.key === "Escape") setTraceBoth([]);
  };

  const hint = () => {
    const next = words.findIndex((_, i) => !foundSet.has(i));
    if (next < 0) return;
    const shown = hints[next] ?? 0;
    if (shown >= words[next].word.length - 1) return;
    setHints({ ...hints, [next]: shown + 1 });
  };
  const hinted = new Map<number, number>(); // cell -> word index, for revealed first letters
  Object.entries(hints).forEach(([wi, n]) => {
    const i = Number(wi);
    if (!foundSet.has(i)) words[i].cells.slice(0, n).forEach((c) => hinted.set(c, i));
  });

  const center = (cell: number) => ({ x: (cell % size) + 0.5, y: Math.floor(cell / size) + 0.5 });
  const pointsOf = (cells: number[]) => cells.map((c) => `${center(c).x},${center(c).y}`).join(" ");
  const colourOf = (wi: number) => BLOCKS_PALETTE[wi % BLOCKS_PALETTE.length];
  const traceSet = new Set(trace);
  const lastFound = found[found.length - 1];
  const rippleOrigin = lastFound !== undefined ? words[lastFound].cells.at(-1)! : 0;
  const distance = (cell: number) =>
    Math.abs((cell % size) - (rippleOrigin % size)) + Math.abs(Math.floor(cell / size) - Math.floor(rippleOrigin / size));

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-4">
      <div className="flex h-9 items-center justify-between">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={trace.length ? "trace" : message ? `${message.text}-${shakeKey}` : "idle"}
            initial={{ opacity: 0, y: 4 }}
            animate={message?.tone === "bad" && !trace.length && !reduced ? { opacity: 1, y: 0, x: [0, -4, 4, -4, 4, 0] } : { opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.base, ease: ease.out }}
            className={`truncate font-mono ${
              trace.length
                ? "text-heading-lg font-bold uppercase tracking-[0.12em] text-paper"
                : message?.tone === "good"
                  ? "text-heading-lg font-bold uppercase tracking-[0.12em] text-paper"
                  : "text-body text-fog"
            }`}
          >
            {trace.length ? wordOf(puzzle, trace) : message ? message.text : "trace a word"}
          </motion.span>
        </AnimatePresence>
        <span className="shrink-0 text-caption uppercase tracking-wide text-steel">
          {found.length} / {words.length} words
        </span>
      </div>

      <div
        ref={gridRef}
        role="application"
        tabIndex={0}
        aria-label={`weave board, ${size} by ${size}. Arrow keys move, space adds a letter, enter submits the word, backspace removes a letter.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragging.current = false;
          setTraceBoth([]);
        }}
        onKeyDown={onKeyDown}
        className="group/board relative grid aspect-square w-full touch-none select-none rounded-control outline-none focus-visible:ring-1 focus-visible:ring-paper"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${size}, minmax(0, 1fr))` }}
      >
        <svg viewBox={`0 0 ${size} ${size}`} className="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden>
          {found.map((wi) => (
            <polyline key={wi} points={pointsOf(words[wi].cells)} fill="none" stroke={colourOf(wi)} strokeOpacity={0.55} strokeWidth={0.22} strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {trace.length > 1 && (
            <polyline points={pointsOf(trace)} fill="none" className="stroke-paper" strokeOpacity={0.5} strokeWidth={0.24} strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>

        {letters.map((letter, cell) => {
          const owner = ownerOf[cell];
          const inTrace = traceSet.has(cell);
          const hintWord = hinted.get(cell);
          return (
            <div key={cell} className="relative z-10 p-[4px]">
              <motion.div
                animate={solved && !reduced ? { scale: [1, 1.12, 1] } : inTrace && !reduced ? { scale: 1.06 } : { scale: 1 }}
                transition={solved ? { duration: 0.42, ease: ease.spring, delay: distance(cell) * 0.035 } : { duration: dur.fast, ease: ease.spring }}
                className={`flex h-full w-full items-center justify-center rounded-full font-mono text-[clamp(18px,6vw,28px)] font-bold uppercase transition-colors duration-[var(--dur-fast)] ${
                  owner >= 0 ? "text-void" : inTrace ? "bg-paper text-void" : "bg-graphite text-paper"
                } ${cell === cursor ? "group-focus-visible/board:outline group-focus-visible/board:outline-1 group-focus-visible/board:outline-paper" : ""}`}
                style={owner >= 0 ? { backgroundColor: colourOf(owner) } : hintWord !== undefined && !inTrace ? { boxShadow: `inset 0 0 0 2px ${colourOf(hintWord)}` } : undefined}
              >
                {letter}
              </motion.div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-caption text-steel">every letter is used once</span>
        <Button variant="ghost" arrow={false} onClick={hint} disabled={solved} className="h-10 px-4 text-[14px]">
          hint{hintCount ? ` · ${hintCount}` : ""}
        </Button>
      </div>
      <p className="sr-only" aria-live="polite">
        {solved ? "Solved." : message ? message.text : `${found.length} of ${words.length} words found.`}
      </p>
    </div>
  );
}
