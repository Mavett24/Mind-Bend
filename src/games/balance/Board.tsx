"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { BoardProps } from "@/games/types";
import { dur, ease } from "@/lib/motion";
import { HintButton } from "@/components/HintButton";
import { balanceHint, DOT, EMPTY, findViolations, isSolved, lines, RING, type BalanceHint, type BalancePuzzle, type Cell } from "./engine";

/** Rule breaks appear after a pause, so the board doesn't nag mid-thought (docs/games/balance.md). */
const VIOLATION_DELAY_MS = 600;

const next = (v: Cell): Cell => (v === EMPTY ? DOT : v === DOT ? RING : EMPTY);

function Symbol({ value }: { value: Cell }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {value !== EMPTY && (
        <motion.span
          key={value}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0, transition: { duration: dur.fast, ease: ease.in } }}
          transition={{ duration: dur.base, ease: ease.spring }}
          className={
            value === DOT
              ? "block h-[44%] w-[44%] rounded-full bg-paper"
              : "block h-[44%] w-[44%] rounded-full border-[3px] border-paper"
          }
        />
      )}
    </AnimatePresence>
  );
}

export function BalanceBoard({ puzzle, onSolved }: BoardProps<BalancePuzzle>) {
  const { size, givens, links } = puzzle;
  const [grid, setGrid] = useState<Cell[]>(() => givens.slice());
  const [shown, setShown] = useState(() => findViolations(size, givens, links));
  const [focus, setFocus] = useState(() => givens.findIndex((g) => g === EMPTY));
  const [solved, setSolved] = useState(false);
  const [rippleFrom, setRippleFrom] = useState(0);
  const [hint, setHint] = useState<BalanceHint | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const mistakes = useRef(0);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const reduced = useReducedMotion();
  const allLines = useMemo(() => lines(size), [size]);
  const lastChanged = useRef(0);

  // Debounced rule check, plus the solve check (immediate).
  useEffect(() => {
    if (isSolved(size, grid, links)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- solving is derived from the grid the player built
      setSolved(true);
      setRippleFrom(lastChanged.current);
      setShown({ lines: new Set(), links: new Set() });
      setHint(null);
      onSolved({ extra: { label: "hints", value: hintsUsed } });
      return;
    }
    const id = setTimeout(() => {
      const v = findViolations(size, grid, links);
      setShown((prev) => {
        if (v.lines.size + v.links.size > prev.lines.size + prev.links.size) mistakes.current++;
        return v;
      });
    }, VIOLATION_DELAY_MS);
    return () => clearTimeout(id);
  }, [grid, hintsUsed, links, onSolved, size]);

  const set = (cell: number, value: Cell) => {
    if (solved || givens[cell] !== EMPTY) return;
    lastChanged.current = cell;
    // The hint stays up until the player acts on the cell it points at.
    if (hint && hint.cell === cell) setHint(null);
    setGrid((g) => {
      const copy = g.slice() as Cell[];
      copy[cell] = value;
      return copy;
    });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(6);
  };

  const giveHint = () => {
    const h = balanceHint(puzzle, grid);
    if (!h) return;
    setHint(h);
    setHintsUsed((n) => n + 1);
    moveFocus(h.cell);
  };

  const moveFocus = (cell: number) => {
    setFocus(cell);
    cellRefs.current[cell]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, cell: number) => {
    const r = Math.floor(cell / size);
    const c = cell % size;
    const moves: Record<string, number | null> = {
      ArrowUp: r > 0 ? cell - size : null,
      ArrowDown: r < size - 1 ? cell + size : null,
      ArrowLeft: c > 0 ? cell - 1 : null,
      ArrowRight: c < size - 1 ? cell + 1 : null,
    };
    if (e.key in moves) {
      e.preventDefault();
      const t = moves[e.key];
      if (t !== null) moveFocus(t);
    } else if (e.key === "1") set(cell, DOT);
    else if (e.key === "2") set(cell, RING);
    else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") set(cell, EMPTY);
  };

  const badCells = new Set<number>();
  shown.lines.forEach((li) => allLines[li].forEach((c) => badCells.add(c)));

  const distance = (cell: number) => {
    const o = rippleFrom;
    return Math.abs((cell % size) - (o % size)) + Math.abs(Math.floor(cell / size) - Math.floor(o / size));
  };

  return (
    <div className="w-full max-w-[400px]">
      <div
        role="grid"
        aria-label={`balance board, ${size} by ${size}`}
        className="relative grid aspect-square w-full"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {grid.map((value, cell) => {
          const given = givens[cell] !== EMPTY;
          const row = Math.floor(cell / size) + 1;
          const col = (cell % size) + 1;
          return (
            <div key={cell} className="p-[3px]" role="gridcell">
              <motion.button
                ref={(el) => {
                  cellRefs.current[cell] = el;
                }}
                type="button"
                tabIndex={cell === focus ? 0 : -1}
                aria-label={`row ${row}, column ${col}: ${value === DOT ? "dot" : value === RING ? "ring" : "empty"}${given ? ", given" : ""}`}
                onClick={() => {
                  setFocus(cell);
                  set(cell, next(value));
                }}
                onKeyDown={(e) => onKeyDown(e, cell)}
                animate={solved && !reduced ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                transition={solved ? { duration: 0.42, ease: ease.spring, delay: distance(cell) * 0.035 } : { duration: dur.fast }}
                className={`relative flex h-full w-full items-center justify-center rounded-cell transition-colors duration-[var(--dur-fast)] ${
                  given ? "cursor-default bg-slate/60" : "bg-graphite hover:bg-iron"
                } ${hint?.related.includes(cell) ? "ring-1 ring-fog/60" : ""}`}
              >
                {hint?.cell === cell && (
                  <motion.span
                    aria-hidden
                    className={`pointer-events-none absolute inset-0 rounded-cell border-2 ${hint.kind === "wrong" ? "border-ember" : "border-paper"}`}
                    animate={reduced ? { opacity: 1 } : { opacity: [1, 0.35, 1] }}
                    transition={reduced ? { duration: 0 } : { duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <span className={`flex h-full w-full items-center justify-center ${given ? "opacity-100" : "opacity-90"}`}>
                  <Symbol value={value} />
                </span>
                <AnimatePresence>
                  {badCells.has(cell) && (
                    <motion.span
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      exit={{ scaleX: 0 }}
                      transition={{ duration: dur.base, ease: ease.out }}
                      className="absolute inset-x-[18%] bottom-[10%] h-[2px] rounded-full bg-ember"
                    />
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          );
        })}

        {links.map((link, i) => {
          const horizontal = link.b === link.a + 1;
          const r = Math.floor(link.a / size);
          const c = link.a % size;
          const left = horizontal ? ((c + 1) / size) * 100 : ((c + 0.5) / size) * 100;
          const top = horizontal ? ((r + 0.5) / size) * 100 : ((r + 1) / size) * 100;
          const broken = shown.links.has(i);
          return (
            <span
              key={i}
              aria-hidden
              className={`pointer-events-none absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-carbon font-mono text-[13px] font-bold leading-none transition-colors duration-[var(--dur-base)] ${
                broken ? "bg-ember text-void" : "bg-void text-paper"
              }`}
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              {link.type === "eq" ? "=" : "×"}
            </span>
          );
        })}
      </div>
      <div className="mt-4 flex min-h-10 items-start justify-between gap-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={hint ? `${hint.cell}-${hint.reason}` : "none"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.base, ease: ease.out }}
            className={`pt-1 text-body ${hint?.kind === "wrong" ? "text-paper" : "text-fog"}`}
            aria-live="polite"
          >
            {hint ? hint.reason : "\u00a0"}
          </motion.p>
        </AnimatePresence>
        <HintButton onHint={giveHint} count={hintsUsed} disabled={solved} />
      </div>
      <p className="sr-only" aria-live="polite">
        {solved
          ? "Solved."
          : shown.lines.size + shown.links.size > 0
            ? `${shown.lines.size + shown.links.size} rule ${shown.lines.size + shown.links.size === 1 ? "break" : "breaks"}.`
            : ""}
      </p>
    </div>
  );
}
