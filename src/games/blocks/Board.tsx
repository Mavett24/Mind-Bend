"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { BoardProps } from "@/games/types";
import { dur, ease } from "@/lib/motion";
import {
  applyGesture,
  clampedCell,
  isSolved,
  rectFromCorners,
  type BlocksPuzzle,
  type Placed,
  type Rect,
  type Shape,
} from "./engine";
import { BLOCKS_PALETTE } from "./palette";

/** Shape hint beside a clue's area. "any" is a dashed square, so a missing hint never looks like a missing glyph. */
function ShapeGlyph({ shape }: { shape: Shape }) {
  const dims = { square: [7, 7], wide: [10, 5], tall: [5, 10], any: [8, 8] }[shape];
  return (
    <svg viewBox="0 0 12 12" className="h-[0.95em] w-[0.95em] shrink-0" aria-hidden>
      <rect
        x={(12 - dims[0]) / 2}
        y={(12 - dims[1]) / 2}
        width={dims[0]}
        height={dims[1]}
        rx={1}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeDasharray={shape === "any" ? "2 1.6" : undefined}
        opacity={shape === "any" ? 0.7 : 1}
      />
    </svg>
  );
}

const SHAPE_WORD: Record<Shape, string> = { square: "square", wide: "wide", tall: "tall", any: "any shape" };

export function BlocksBoard({ puzzle, onSolved }: BoardProps<BlocksPuzzle>) {
  const { size, clues } = puzzle;
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [drag, setDrag] = useState<{ anchor: number; current: number } | null>(null);
  const [cursor, setCursor] = useState(clues[0]?.cell ?? 0);
  const [keyAnchor, setKeyAnchor] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const redraws = useRef(0);
  const moved = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!solved && isSolved(puzzle, placed)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- solving is derived from what the player placed
      setSolved(true);
      onSolved({ extra: { label: "redraws", value: redraws.current } });
    }
  }, [onSolved, placed, puzzle, solved]);

  /** Every press-drag-release goes through the tested rules in engine.ts (applyGesture). */
  const commit = (anchor: number, current: number, didMove: boolean) => {
    const result = applyGesture(puzzle, placed, anchor, current, didMove);
    if (result.placed.length === placed.length && result.removed === 0) return; // a tap on empty space
    redraws.current += result.removed;
    setPlaced(result.placed);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
  };

  const pointToCell = (e: React.PointerEvent, clamp: boolean): number | null => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = ((e.clientX - rect.left) / rect.width) * size;
    const y = ((e.clientY - rect.top) / rect.height) * size;
    if (!clamp && (x < 0 || y < 0 || x >= size || y >= size)) return null;
    return clampedCell(size, x, y);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (solved) return;
    const cell = pointToCell(e, false);
    if (cell === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    moved.current = false;
    setDrag({ anchor: cell, current: cell });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    // Clamped: sliding past the edge keeps stretching the rectangle to the edge.
    const cell = pointToCell(e, true);
    if (cell === null || cell === drag.current) return;
    moved.current = true;
    setDrag({ ...drag, current: cell });
  };
  const onPointerUp = () => {
    if (!drag) return;
    commit(drag.anchor, drag.current, moved.current);
    setDrag(null);
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
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (keyAnchor === null) setKeyAnchor(cursor);
      else {
        commit(keyAnchor, cursor, keyAnchor !== cursor);
        setKeyAnchor(null);
      }
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      commit(cursor, cursor, false);
    } else if (e.key === "Escape") setKeyAnchor(null);
  };

  // No preview for a plain press, so taps don't flash a 1×1 box.
  const preview =
    drag && drag.anchor !== drag.current
      ? rectFromCorners(size, drag.anchor, drag.current)
      : keyAnchor !== null
        ? rectFromCorners(size, keyAnchor, cursor)
        : null;
  const pct = (n: number) => `${(n / size) * 100}%`;
  const clueIndexAt = new Map(clues.map((clue, i) => [clue.cell, i]));
  const lastPlaced = placed[placed.length - 1]?.rect;
  const rippleDistance = (rect: Rect) =>
    lastPlaced ? Math.abs(rect.r - lastPlaced.r) + Math.abs(rect.c - lastPlaced.c) : 0;

  return (
    <div className="w-full max-w-[400px]">
      <div
        ref={gridRef}
        role="application"
        tabIndex={0}
        aria-label={`blocks board, ${size} by ${size}. Arrow keys move, Enter starts and places a rectangle, Delete removes one.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setKeyAnchor(null)}
        className="group/board relative grid aspect-square w-full touch-none select-none rounded-control outline-none focus-visible:ring-1 focus-visible:ring-paper"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: size * size }, (_, cell) => {
          const ci = clueIndexAt.get(cell);
          const clue = ci !== undefined ? clues[ci] : null;
          return (
            <div key={cell} className="p-[3px]">
              <div
                className={`flex h-full w-full items-center justify-center gap-[2px] rounded-cell bg-graphite ${
                  cell === cursor ? "group-focus-visible/board:outline group-focus-visible/board:outline-1 group-focus-visible/board:outline-paper" : ""
                }`}
              >
                {clue && (
                  <span
                    aria-label={`clue ${clue.area}, ${SHAPE_WORD[clue.shape]}`}
                    className={`relative z-10 flex items-center justify-center font-mono font-bold leading-none ${
                      clue.area >= 10 && size >= 7 ? "flex-col gap-[1px]" : "gap-[2px]"
                    }`}
                    style={{ color: BLOCKS_PALETTE[clue.color], fontSize: `clamp(10px, ${26 / size}vw, 16px)` }}
                  >
                    {clue.area}
                    <ShapeGlyph shape={clue.shape} />
                  </span>
                )}
              </div>
            </div>
          );
        })}

        <AnimatePresence>
          {placed.map((p) => {
            const colour = p.clue >= 0 ? BLOCKS_PALETTE[clues[p.clue].color] : null;
            return (
              <motion.div
                key={`${p.rect.r}-${p.rect.c}-${p.rect.h}-${p.rect.w}`}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={solved && !reduced ? { opacity: 1, scale: [1, 1.05, 1] } : { opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92, transition: { duration: dur.fast, ease: ease.in } }}
                transition={
                  solved ? { duration: 0.42, ease: ease.spring, delay: rippleDistance(p.rect) * 0.04 } : { duration: dur.base, ease: ease.spring }
                }
                className={`pointer-events-none absolute rounded-cell border-2 ${colour ? "" : "border-dashed border-fog"}`}
                style={{
                  left: `calc(${pct(p.rect.c)} + 3px)`,
                  top: `calc(${pct(p.rect.r)} + 3px)`,
                  width: `calc(${pct(p.rect.w)} - 6px)`,
                  height: `calc(${pct(p.rect.h)} - 6px)`,
                  ...(colour ? { borderColor: colour, backgroundColor: `${colour}38` } : {}),
                }}
              >
                {!colour && (
                  <span className="absolute left-1 top-1 rounded-full bg-carbon px-1.5 font-mono text-[11px] leading-[18px] text-fog">
                    {p.rect.h * p.rect.w}
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {preview && (
          <div
            className="pointer-events-none absolute rounded-cell border-2 border-dashed border-paper bg-paper/10"
            style={{
              left: `calc(${pct(preview.c)} + 3px)`,
              top: `calc(${pct(preview.r)} + 3px)`,
              width: `calc(${pct(preview.w)} - 6px)`,
              height: `calc(${pct(preview.h)} - 6px)`,
            }}
          >
            <span className="absolute -top-6 left-0 rounded-full bg-paper px-2 font-mono text-caption font-bold text-void">
              {preview.h * preview.w}
            </span>
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {solved
          ? "Solved."
          : `${placed.filter((p) => p.clue >= 0).length} of ${clues.length} rectangles placed. ${size * size - placed.reduce((n, p) => n + p.rect.h * p.rect.w, 0)} cells left.`}
      </p>
    </div>
  );
}
