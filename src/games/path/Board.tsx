"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { BoardProps } from "@/games/types";
import { dur, ease } from "@/lib/motion";
import { adjacency, canExtend, isSolved, type PathPuzzle } from "./engine";

const PAD = 0.06; // gap around each cell, in cell units

export function PathBoard({ puzzle, onSolved }: BoardProps<PathPuzzle>) {
  const { size, numbers, walls } = puzzle;
  const adj = useMemo(() => adjacency(size, walls), [size, walls]);
  const startCell = useMemo(() => numbers.indexOf(1), [numbers]);
  const [line, setLine] = useState<number[]>([startCell]);
  const [solved, setSolved] = useState(false);
  const backtracks = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const reduced = useReducedMotion();
  // Mirrors `line` for event handlers; every setLine call updates it too.
  const lineRef = useRef(line);

  const maxNumber = useMemo(() => Math.max(...numbers), [numbers]);
  const nextNumber = line.reduce((n, cell) => (numbers[cell] === n ? n + 1 : n), 1);

  /** One step of input towards `cell`: extend, back up, or cut the line. */
  const step = useCallback(
    (cell: number) => {
      if (solved) return;
      const current = lineRef.current;
      const head = current[current.length - 1];
      if (cell === head) return;
      let next: number[] | null = null;
      if (current.length >= 2 && cell === current[current.length - 2]) {
        next = current.slice(0, -1);
        backtracks.current++;
      } else if (current.includes(cell)) {
        next = current.slice(0, current.indexOf(cell) + 1);
        backtracks.current++;
      } else if (canExtend(puzzle, current, cell, adj)) {
        next = [...current, cell];
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(6);
      }
      if (next) {
        lineRef.current = next;
        setLine(next);
      }
    },
    [adj, puzzle, solved],
  );

  useEffect(() => {
    if (!solved && isSolved(puzzle, line)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- solving is derived from the line the player drew
      setSolved(true);
      onSolved({ extra: { label: "backtracks", value: backtracks.current } });
    }
  }, [line, onSolved, puzzle, solved]);

  const toGrid = (e: React.PointerEvent): { x: number; y: number } | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: ((e.clientX - rect.left) / rect.width) * size, y: ((e.clientY - rect.top) / rect.height) * size };
  };
  const cellAt = (p: { x: number; y: number }) => {
    const c = Math.floor(p.x);
    const r = Math.floor(p.y);
    return c < 0 || r < 0 || c >= size || r >= size ? null : r * size + c;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const p = toGrid(e);
    if (!p) return;
    const cell = cellAt(p);
    if (cell === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    lastPoint.current = p;
    if (cell === startCell && lineRef.current.length > 1) {
      backtracks.current++;
      lineRef.current = [startCell];
      setLine([startCell]);
    } else {
      step(cell);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const p = toGrid(e);
    const prev = lastPoint.current;
    if (!p || !prev) return;
    // Sample along the movement so fast drags don't skip cells.
    const distance = Math.hypot(p.x - prev.x, p.y - prev.y);
    const samples = Math.max(1, Math.ceil(distance / 0.25));
    for (let i = 1; i <= samples; i++) {
      const cell = cellAt({ x: prev.x + ((p.x - prev.x) * i) / samples, y: prev.y + ((p.y - prev.y) * i) / samples });
      if (cell !== null) step(cell);
    }
    lastPoint.current = p;
  };

  const onPointerUp = () => {
    dragging.current = false;
    lastPoint.current = null;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const head = lineRef.current[lineRef.current.length - 1];
    const r = Math.floor(head / size);
    const c = head % size;
    const target: Record<string, number | null> = {
      ArrowUp: r > 0 ? head - size : null,
      ArrowDown: r < size - 1 ? head + size : null,
      ArrowLeft: c > 0 ? head - 1 : null,
      ArrowRight: c < size - 1 ? head + 1 : null,
    };
    if (e.key in target) {
      e.preventDefault();
      const t = target[e.key];
      if (t !== null) step(t);
    } else if (e.key === "Backspace" && lineRef.current.length > 1) {
      e.preventDefault();
      step(lineRef.current[lineRef.current.length - 2]);
    }
  };

  const center = (cell: number) => ({ x: (cell % size) + 0.5, y: Math.floor(cell / size) + 0.5 });
  const lastCell = line[line.length - 1];
  const points = line.map((cell) => {
    const p = center(cell);
    return `${p.x},${p.y}`;
  });
  const visited = new Set(line);
  const distanceFromLast = (cell: number) =>
    Math.abs((cell % size) - (lastCell % size)) + Math.abs(Math.floor(cell / size) - Math.floor(lastCell / size));

  return (
    <div className="w-full max-w-[400px]">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        role="application"
        aria-label={`path board, ${size} by ${size}. Arrow keys extend the line, backspace undoes.`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="aspect-square w-full touch-none select-none rounded-control outline-none focus-visible:ring-1 focus-visible:ring-paper"
      >
        {numbers.map((_, cell) => {
          const { x, y } = center(cell);
          return (
            <motion.rect
              key={cell}
              x={x - 0.5 + PAD}
              y={y - 0.5 + PAD}
              width={1 - PAD * 2}
              height={1 - PAD * 2}
              rx={0.16}
              className={visited.has(cell) ? "fill-ember-wash" : "fill-graphite"}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
              animate={solved && !reduced ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              transition={
                solved ? { duration: 0.42, ease: ease.spring, delay: distanceFromLast(cell) * 0.035 } : { duration: dur.fast }
              }
            />
          );
        })}

        {walls.map(([a, b]) => {
          const ra = Math.floor(a / size);
          const ca = a % size;
          const horizontalNeighbours = b === a + 1;
          return horizontalNeighbours ? (
            <line key={`${a}-${b}`} x1={ca + 1} y1={ra + 0.08} x2={ca + 1} y2={ra + 0.92} className="stroke-paper" strokeWidth={0.09} strokeLinecap="round" />
          ) : (
            <line key={`${a}-${b}`} x1={ca + 0.08} y1={ra + 1} x2={ca + 0.92} y2={ra + 1} className="stroke-paper" strokeWidth={0.09} strokeLinecap="round" />
          );
        })}

        <polyline
          points={points.join(" ")}
          fill="none"
          className="stroke-ember"
          strokeWidth={0.36}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {!solved && (
          <motion.circle
            key={lastCell}
            cx={center(lastCell).x}
            cy={center(lastCell).y}
            initial={{ r: 0.12 }}
            animate={{ r: 0.2 }}
            transition={{ duration: dur.base, ease: ease.spring }}
            className="fill-void"
          />
        )}

        {numbers.map((n, cell) => {
          if (!n) return null;
          const { x, y } = center(cell);
          const reached = visited.has(cell);
          return (
            <g key={`n-${cell}`}>
              <circle cx={x} cy={y} r={0.3} className={reached ? "fill-paper" : "fill-chalk"} />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-void font-mono font-bold"
                fontSize={0.32}
              >
                {n}
              </text>
            </g>
          );
        })}

      </svg>
      <p className="sr-only" aria-live="polite">
        {solved
          ? "Solved."
          : `${line.length} of ${size * size} cells. ${nextNumber <= maxNumber ? `Next number ${nextNumber}.` : "All numbers reached."}`}
      </p>
    </div>
  );
}
