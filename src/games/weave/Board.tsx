"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { BoardProps } from "@/games/types";
import { HintButton } from "@/components/HintButton";
import { dur, ease } from "@/lib/motion";
import { BLOCKS_PALETTE } from "@/games/blocks/palette";
import { adjacent4, isBlocked, judgeTrace, slotOrder, wordOf, type WeavePuzzle } from "./engine";

/** Generous hit area: without diagonals there's nothing to clip. */
const HIT_RADIUS = 0.5;

type Message = { text: string; tone: "good" | "info" | "bad" } | null;

export function WeaveBoard({ puzzle, onSolved }: BoardProps<WeavePuzzle>) {
  const { size, letters, words } = puzzle;
  const [found, setFound] = useState<number[]>([]);
  const [trace, setTrace] = useState<number[]>([]);
  const [message, setMessage] = useState<Message>(null);
  const [shakeKey, setShakeKey] = useState(0);
  /** Revealed letters per word index. */
  const [hints, setHints] = useState<Record<number, number>>({});
  const [hintsUsed, setHintsUsed] = useState(0);
  const [cursor, setCursor] = useState(() => letters.findIndex((l) => l !== ""));
  const [solved, setSolved] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const traceRef = useRef<number[]>([]);
  const reduced = useReducedMotion();

  const order = useMemo(() => slotOrder(puzzle), [puzzle]);
  const foundSet = useMemo(() => new Set(found), [found]);
  const ownerOf = useMemo(() => {
    const owner = new Array<number>(size * size).fill(-1);
    found.forEach((wi) => words[wi].cells.forEach((c) => (owner[c] = wi)));
    return owner;
  }, [found, size, words]);
  /** Colour by slot position, so the slots and the grid always agree. */
  const colourOf = (wi: number) => BLOCKS_PALETTE[order.indexOf(wi) % BLOCKS_PALETTE.length];

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), 1600);
    return () => clearTimeout(id);
  }, [message]);

  const setTraceBoth = (t: number[]) => {
    traceRef.current = t;
    setTrace(t);
  };

  const usable = (cell: number) => !isBlocked(puzzle, cell) && ownerOf[cell] < 0;

  const extend = (cell: number) => {
    const t = traceRef.current;
    if (!usable(cell)) return;
    if (t.length === 0) return setTraceBoth([cell]);
    const head = t[t.length - 1];
    if (cell === head) return;
    if (t.length >= 2 && cell === t[t.length - 2]) return setTraceBoth(t.slice(0, -1));
    if (!t.includes(cell) && adjacent4(size, head, cell)) {
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
        onSolved({ extra: { label: "hints", value: hintsUsed } });
      }
    } else if (result.kind === "elsewhere") {
      setMessage({ text: `${wordOf(puzzle, t)}: a word, but not hidden here`, tone: "info" });
    } else if (result.kind === "invalid") {
      setMessage({ text: `${wordOf(puzzle, t)}: not a word`, tone: "bad" });
      setShakeKey((k) => k + 1);
    } else if (result.kind === "short" && t.length > 1) {
      setMessage({ text: "three letters or more", tone: "info" });
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
    if (Math.abs(x - (c + 0.5)) > HIT_RADIUS * 0.9 || Math.abs(y - (r + 0.5)) > HIT_RADIUS * 0.9) return null;
    return r * size + c;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (solved) return;
    const cell = cellFromPointer(e);
    if (cell === null || !usable(cell)) return;
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

  /** Reveal the next letter of the shortest unfound word. */
  const giveHint = () => {
    const wi = order.find((i) => !foundSet.has(i) && (hints[i] ?? 0) < words[i].word.length - 1);
    if (wi === undefined) return;
    setHints({ ...hints, [wi]: (hints[wi] ?? 0) + 1 });
    setHintsUsed((n) => n + 1);
  };
  const hinted = new Map<number, number>(); // cell -> word index
  Object.entries(hints).forEach(([wi, n]) => {
    const i = Number(wi);
    if (!foundSet.has(i)) words[i].cells.slice(0, n).forEach((c) => hinted.set(c, i));
  });

  const center = (cell: number) => ({ x: (cell % size) + 0.5, y: Math.floor(cell / size) + 0.5 });
  const pointsOf = (cells: number[]) => cells.map((c) => `${center(c).x},${center(c).y}`).join(" ");
  const traceSet = new Set(trace);
  const lastFound = found[found.length - 1];
  const rippleOrigin = lastFound !== undefined ? words[lastFound].cells.at(-1)! : 0;
  const distance = (cell: number) =>
    Math.abs((cell % size) - (rippleOrigin % size)) + Math.abs(Math.floor(cell / size) - Math.floor(rippleOrigin / size));
  const maxLen = Math.max(...words.map((w) => w.word.length));

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
              trace.length || message?.tone === "good" ? "text-heading-lg font-medium uppercase tracking-[0.1em] text-paper" : "text-body text-fog"
            }`}
          >
            {trace.length ? wordOf(puzzle, trace) : message ? message.text : "trace a word"}
          </motion.span>
        </AnimatePresence>
        <span className="shrink-0 text-caption uppercase text-steel">
          {found.length} / {words.length}
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
            <polyline key={wi} points={pointsOf(words[wi].cells)} fill="none" stroke={colourOf(wi)} strokeOpacity={0.55} strokeWidth={0.24} strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {trace.length > 1 && (
            <polyline points={pointsOf(trace)} fill="none" className="stroke-paper" strokeOpacity={0.5} strokeWidth={0.26} strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>

        {letters.map((letter, cell) => {
          if (letter === "") {
            return (
              <div key={cell} className="relative z-10 p-[4px]" aria-hidden>
                <div className="h-full w-full rounded-cell bg-slate/70" />
              </div>
            );
          }
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

      {/* Word-length slots, shortest first, as in Wend. */}
      <div className="flex flex-col gap-1.5" aria-label="hidden words">
        {order.map((wi) => {
          const w = words[wi];
          const isFound = foundSet.has(wi);
          const revealed = hints[wi] ?? 0;
          return (
            <div key={wi} className="flex gap-1" aria-label={isFound ? w.word : `${w.word.length} letters`}>
              {[...w.word].map((ch, i) => {
                const show = isFound || i < revealed;
                return (
                  <motion.span
                    key={i}
                    initial={false}
                    animate={isFound && !reduced ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                    transition={{ duration: 0.36, ease: ease.spring, delay: isFound ? i * 0.03 : 0 }}
                    className="flex aspect-square items-center justify-center rounded-[6px] font-mono text-[13px] font-bold uppercase"
                    style={{
                      width: `calc((100% - ${(maxLen - 1) * 4}px) / ${maxLen})`,
                      maxWidth: 32,
                      ...(isFound
                        ? { backgroundColor: colourOf(wi), color: "var(--color-void)" }
                        : { backgroundColor: "var(--color-graphite)", color: show ? colourOf(wi) : "transparent" }),
                    }}
                  >
                    {show ? ch : "·"}
                  </motion.span>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[13px] text-steel">Up, down, left, right. No diagonals.</span>
        <HintButton onHint={giveHint} count={hintsUsed} disabled={solved} />
      </div>
      <p className="sr-only" aria-live="polite">
        {solved ? "Solved." : message ? message.text : `${found.length} of ${words.length} words found.`}
      </p>
    </div>
  );
}
