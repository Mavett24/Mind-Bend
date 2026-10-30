"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { BoardProps } from "@/games/types";
import { HintButton } from "@/components/HintButton";
import { dur, ease } from "@/lib/motion";
import { conflicts, geometry, isSolved, sudokuHint, type SudokuHint, type SudokuPuzzle } from "./engine";

const bit = (d: number) => 1 << d;

export function SudokuBoard({ puzzle, onSolved }: BoardProps<SudokuPuzzle>) {
  const { size, boxRows, boxCols, givens } = puzzle;
  const g = geometry(size);
  const [grid, setGrid] = useState<number[]>(() => givens.slice());
  const [notes, setNotes] = useState<number[]>(() => givens.map(() => 0));
  const [selected, setSelected] = useState<number>(() => givens.findIndex((v) => !v));
  const [noteMode, setNoteMode] = useState(false);
  const [hint, setHint] = useState<SudokuHint | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [solved, setSolved] = useState(false);
  const [rippleFrom, setRippleFrom] = useState(0);
  const lastChanged = useRef(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const clashing = useMemo(() => conflicts(size, grid), [grid, size]);
  const counts = useMemo(() => {
    const c = new Array(size + 1).fill(0);
    grid.forEach((v) => v && c[v]++);
    return c;
  }, [grid, size]);

  useEffect(() => {
    if (!solved && isSolved(puzzle, grid)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- solving is derived from the grid the player filled
      setSolved(true);
      setRippleFrom(lastChanged.current);
      setHint(null);
      onSolved({ extra: { label: "hints", value: hintsUsed } });
    }
  }, [grid, hintsUsed, onSolved, puzzle, solved]);

  const editable = (cell: number) => !solved && cell >= 0 && !givens[cell];

  const input = (digit: number) => {
    const cell = selected;
    if (!editable(cell)) return;
    if (noteMode && digit) {
      if (grid[cell]) return;
      setNotes((n) => n.map((m, i) => (i === cell ? m ^ bit(digit) : m)));
      return;
    }
    const value = grid[cell] === digit ? 0 : digit; // tapping the same number again clears it
    lastChanged.current = cell;
    setGrid((gr) => gr.map((v, i) => (i === cell ? value : v)));
    if (value) {
      // Placing a number clears it from the notes of every cell it sees.
      setNotes((n) => n.map((m, i) => (i === cell ? 0 : g.peers[cell].includes(i) ? m & ~bit(value) : m)));
    }
    if (hint && hint.cell === cell) setHint(null);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(6);
  };

  const erase = () => {
    if (!editable(selected)) return;
    setGrid((gr) => gr.map((v, i) => (i === selected ? 0 : v)));
    setNotes((n) => n.map((m, i) => (i === selected ? 0 : m)));
  };

  const giveHint = () => {
    const h = sudokuHint(puzzle, grid);
    if (!h) return;
    setHint(h);
    setSelected(h.cell);
    setHintsUsed((n) => n + 1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (solved) return;
    const r = Math.floor(selected / size);
    const c = selected % size;
    const moves: Record<string, number | null> = {
      ArrowUp: r > 0 ? selected - size : null,
      ArrowDown: r < size - 1 ? selected + size : null,
      ArrowLeft: c > 0 ? selected - 1 : null,
      ArrowRight: c < size - 1 ? selected + 1 : null,
    };
    if (e.key in moves) {
      e.preventDefault();
      const t = moves[e.key];
      if (t !== null) setSelected(t);
    } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= size) {
      e.preventDefault();
      input(Number(e.key));
    } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
      e.preventDefault();
      erase();
    } else if (e.key.toLowerCase() === "n") {
      setNoteMode((m) => !m);
    }
  };

  const sameUnit = (cell: number) => selected >= 0 && g.unitsOf[cell].some((u, k) => u === g.unitsOf[selected][k]);
  const selectedDigit = selected >= 0 ? grid[selected] : 0;
  const distance = (cell: number) =>
    Math.abs((cell % size) - (rippleFrom % size)) + Math.abs(Math.floor(cell / size) - Math.floor(rippleFrom / size));
  const boxesAcross = size / boxCols;
  const boxesDown = size / boxRows;
  const noteCols = size === 6 ? 3 : 3;

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-4">
      <div
        ref={gridRef}
        role="grid"
        tabIndex={0}
        aria-label={`sudoku, ${size} by ${size}. Arrow keys move, numbers place, N toggles notes, backspace clears.`}
        onKeyDown={onKeyDown}
        className="grid aspect-square w-full select-none gap-[5px] rounded-control outline-none focus-visible:ring-1 focus-visible:ring-paper"
        style={{ gridTemplateColumns: `repeat(${boxesAcross}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${boxesDown}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: boxesAcross * boxesDown }, (_, b) => {
          const box = g.units[2 * size + b];
          return (
            <div
              key={b}
              className="grid gap-[2px]"
              style={{ gridTemplateColumns: `repeat(${boxCols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${boxRows}, minmax(0, 1fr))` }}
            >
              {box.map((cell) => {
                const value = grid[cell];
                const given = givens[cell] !== 0;
                const isSel = cell === selected;
                const highlight = sameUnit(cell);
                const sameDigit = !!selectedDigit && value === selectedDigit && !isSel;
                const clash = clashing.has(cell) && !given;
                const isHint = hint?.cell === cell;
                const isRelated = hint?.related.includes(cell);
                const r = Math.floor(cell / size) + 1;
                const c = (cell % size) + 1;
                return (
                  <motion.button
                    key={cell}
                    type="button"
                    role="gridcell"
                    tabIndex={-1}
                    aria-label={`row ${r}, column ${c}: ${value || "empty"}${given ? ", given" : ""}`}
                    onClick={() => {
                      setSelected(cell);
                      gridRef.current?.focus({ preventScroll: true });
                    }}
                    animate={solved && !reduced ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                    transition={solved ? { duration: 0.42, ease: ease.spring, delay: distance(cell) * 0.03 } : { duration: dur.fast }}
                    className={`relative flex items-center justify-center rounded-[6px] font-mono leading-none transition-colors duration-[var(--dur-fast)] ${
                      isSel ? "bg-slate" : sameDigit ? "bg-slate/60" : highlight ? "bg-iron" : given ? "bg-graphite" : "bg-graphite/70"
                    } ${isRelated ? "ring-1 ring-inset ring-fog/60" : ""}`}
                    style={{ fontSize: size === 6 ? "clamp(18px, 6.5vw, 28px)" : "clamp(15px, 4.8vw, 22px)" }}
                  >
                    {value ? (
                      <span className={given ? "font-bold text-paper" : "font-normal text-entry"}>{value}</span>
                    ) : notes[cell] ? (
                      <span
                        className="grid h-full w-full p-[2px] text-[clamp(7px,2vw,10px)] text-steel"
                        style={{ gridTemplateColumns: `repeat(${noteCols}, minmax(0, 1fr))` }}
                      >
                        {Array.from({ length: size }, (_, i) => (
                          <span key={i} className="flex items-center justify-center">
                            {notes[cell] & bit(i + 1) ? i + 1 : ""}
                          </span>
                        ))}
                      </span>
                    ) : null}
                    {clash && <span className="absolute inset-x-[22%] bottom-[12%] h-[2px] rounded-full bg-ember" />}
                    {isHint && (
                      <motion.span
                        aria-hidden
                        className={`pointer-events-none absolute inset-0 rounded-[6px] border-2 ${hint!.kind === "wrong" ? "border-ember" : "border-paper"}`}
                        animate={reduced ? { opacity: 1 } : { opacity: [1, 0.35, 1] }}
                        transition={reduced ? { duration: 0 } : { duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                    {isSel && !isHint && <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[6px] ring-1 ring-inset ring-paper" />}
                  </motion.button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Number pad */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {Array.from({ length: size }, (_, i) => {
          const d = i + 1;
          const done = counts[d] >= size;
          return (
            <motion.button
              key={d}
              type="button"
              whileTap={{ scale: 0.92 }}
              transition={{ duration: dur.fast, ease: ease.spring }}
              onClick={() => input(d)}
              disabled={solved}
              aria-label={`${noteMode ? "note" : "place"} ${d}`}
              className={`flex h-12 items-center justify-center rounded-cell border font-mono text-heading-sm transition-colors duration-[var(--dur-fast)] ${
                noteMode ? "border-slate text-fog" : "border-iron bg-graphite text-paper"
              } ${done ? "opacity-30" : "hover:border-slate"}`}
            >
              {d}
            </motion.button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setNoteMode((m) => !m)}
            aria-pressed={noteMode}
            className={`inline-flex h-10 items-center rounded-full border px-4 font-mono text-[14px] transition-colors duration-[var(--dur-fast)] ${
              noteMode ? "border-paper bg-paper text-void" : "border-slate text-paper hover:border-fog"
            }`}
          >
            notes {noteMode ? "on" : "off"}
          </button>
          <button
            type="button"
            onClick={erase}
            className="inline-flex h-10 items-center rounded-full border border-slate px-4 font-mono text-[14px] text-paper transition-colors duration-[var(--dur-fast)] hover:border-fog"
          >
            erase
          </button>
        </div>
        <HintButton onHint={giveHint} count={hintsUsed} disabled={solved} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {hint && (
          <motion.p
            key={`${hint.cell}-${hint.reason}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.base, ease: ease.out }}
            className={`text-body ${hint.kind === "wrong" ? "text-paper" : "text-fog"}`}
            aria-live="polite"
          >
            {hint.reason}
          </motion.p>
        )}
      </AnimatePresence>
      <p className="sr-only" aria-live="polite">
        {solved ? "Solved." : clashing.size ? `${clashing.size} cells clash.` : ""}
      </p>
    </div>
  );
}
