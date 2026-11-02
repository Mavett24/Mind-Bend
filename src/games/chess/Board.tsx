"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Chess, type Square } from "chess.js";
import { dur, ease } from "@/lib/motion";
import type { Move } from "./engine";
import { Piece, PIECE_NAME, type PieceColor, type PieceType } from "./pieces";

const FILES = "abcdefgh";

export interface Marker {
  square: Square;
  kind: "correct" | "wrong";
}

export interface Hint {
  /** Stage 1: the piece to move. */
  from: Square;
  /** Stage 2: where it goes. */
  to?: Square;
}

interface ChessBoardProps {
  fen: string;
  /** The colour at the bottom. */
  orientation: PieceColor;
  lastMove: { from: Square; to: Square } | null;
  /** The colour the player may move now, or null while the board is locked. */
  movable: PieceColor | null;
  onMove: (move: Move) => void;
  hint?: Hint | null;
  marker?: Marker | null;
  /** Bumped to shake the board after a wrong move. */
  shake?: number;
}

interface PlacedPiece {
  id: string;
  type: PieceType;
  color: PieceColor;
  square: Square;
}

/** Board index (0 = a8) to square name, and back. */
const squareAt = (i: number) => `${FILES[i % 8]}${8 - Math.floor(i / 8)}` as Square;
const indexOf = (sq: Square) => (8 - Number(sq[1])) * 8 + FILES.indexOf(sq[0]);

/** Screen position (0..7 column and row) of a square for an orientation. */
function screen(sq: Square, orientation: PieceColor) {
  const i = indexOf(sq);
  const col = i % 8;
  const row = Math.floor(i / 8);
  return orientation === "w" ? { col, row } : { col: 7 - col, row: 7 - row };
}

function squareFromScreen(col: number, row: number, orientation: PieceColor): Square | null {
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  return orientation === "w" ? squareAt(row * 8 + col) : squareAt((7 - row) * 8 + (7 - col));
}

const isLight = (sq: Square) => (FILES.indexOf(sq[0]) + Number(sq[1])) % 2 === 1;

let nextId = 0;

/**
 * Gives every piece a stable id across positions, so a moved piece glides instead of popping.
 * A piece keeps its id if it stayed put; otherwise it takes the id of the nearest vanished piece of
 * the same kind (that covers moves, castling, en passant and rewinding). New kinds get new ids.
 */
function assignIds(prev: PlacedPiece[], board: (PlacedPiece | null)[]): PlacedPiece[] {
  const next: PlacedPiece[] = [];
  const left = [...prev];
  const pending: Omit<PlacedPiece, "id">[] = [];
  for (const p of board) {
    if (!p) continue;
    const same = left.findIndex((q) => q.square === p.square && q.type === p.type && q.color === p.color);
    if (same >= 0) next.push({ ...p, id: left.splice(same, 1)[0].id });
    else pending.push(p);
  }
  for (const p of pending) {
    const { col, row } = screen(p.square, "w");
    let best = -1;
    let bestD = Infinity;
    left.forEach((q, i) => {
      if (q.type !== p.type || q.color !== p.color) return;
      const s = screen(q.square, "w");
      const d = Math.abs(s.col - col) + Math.abs(s.row - row);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    next.push({ ...p, id: best >= 0 ? left.splice(best, 1)[0].id : `pc${nextId++}` });
  }
  return next;
}

function readBoard(game: Chess): PlacedPiece[] {
  const out: PlacedPiece[] = [];
  game.board().forEach((rank) =>
    rank.forEach((cell) => {
      if (cell) out.push({ id: "", type: cell.type as PieceType, color: cell.color, square: cell.square });
    }),
  );
  return out;
}

export function ChessBoard({ fen, orientation, lastMove, movable, onMove, hint, marker, shake = 0 }: ChessBoardProps) {
  const reduced = useReducedMotion();
  const game = useMemo(() => new Chess(fen), [fen]);
  const boardRef = useRef<HTMLDivElement>(null);

  const [pieces, setPieces] = useState<PlacedPiece[]>(() => assignIds([], readBoard(game)));
  const [shownFen, setShownFen] = useState(fen);
  if (shownFen !== fen) {
    // Derive ids during render so the new position paints with the right identities (no flash).
    setShownFen(fen);
    setPieces((prev) => assignIds(prev, readBoard(game)));
  }

  const [selected, setSelected] = useState<Square | null>(null);
  const [cursor, setCursor] = useState<Square>(orientation === "w" ? "e2" : "e7");
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);
  /** Pointer position while dragging, in squares from the board's top left. */
  const [drag, setDrag] = useState<{ id: string; from: Square; x: number; y: number; moved: boolean } | null>(null);
  /** The piece just dropped by drag lands without gliding from its old square. */
  const [dropped, setDropped] = useState<string | null>(null);

  useEffect(() => {
    // A new position or a locked board drops any half-made move.
    /* eslint-disable react-hooks/set-state-in-effect -- reset local selection when the position changes */
    setSelected(null);
    setPromo(null);
    setDropped(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [fen, movable]);

  const targets = useMemo(() => {
    if (!selected || !movable) return new Map<Square, { capture: boolean; promotion: boolean }>();
    const map = new Map<Square, { capture: boolean; promotion: boolean }>();
    for (const m of game.moves({ square: selected, verbose: true })) {
      map.set(m.to, { capture: m.isCapture() || m.isEnPassant(), promotion: m.isPromotion() || map.get(m.to)?.promotion === true });
    }
    return map;
  }, [game, selected, movable]);

  const own = useCallback((sq: Square) => {
    const p = game.get(sq);
    return !!p && p.color === movable;
  }, [game, movable]);

  const tryMove = useCallback(
    (from: Square, to: Square) => {
      const legal = game.moves({ square: from, verbose: true }).filter((m) => m.to === to);
      if (!legal.length) return false;
      if (legal.some((m) => m.isPromotion())) {
        setPromo({ from, to });
        return true;
      }
      setSelected(null);
      onMove({ from, to });
      return true;
    },
    [game, onMove],
  );

  const activate = useCallback(
    (sq: Square) => {
      if (!movable) return;
      if (selected && selected !== sq && targets.has(sq)) {
        tryMove(selected, sq);
        return;
      }
      if (own(sq)) setSelected(selected === sq ? null : sq);
      else setSelected(null);
    },
    [movable, selected, targets, tryMove, own],
  );

  // ------------------------------------------------------------ pointer: tap-tap and drag

  /** Pointer position in squares (0..8) from the board's top left. */
  const toGrid = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: ((clientX - rect.left) / rect.width) * 8, y: ((clientY - rect.top) / rect.height) * 8 };
  };
  const pointToSquare = (clientX: number, clientY: number) => {
    const g = toGrid(clientX, clientY);
    return g ? squareFromScreen(Math.floor(g.x), Math.floor(g.y), orientation) : null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!movable || promo || e.button !== 0) return;
    const sq = pointToSquare(e.clientX, e.clientY);
    if (!sq) return;
    setCursor(sq);
    if (own(sq)) {
      const piece = pieces.find((p) => p.square === sq);
      const g = toGrid(e.clientX, e.clientY);
      if (piece && g) setDrag({ id: piece.id, from: sq, ...g, moved: false });
      (e.target as Element).setPointerCapture?.(e.pointerId);
      if (selected !== sq) setSelected(sq);
      return;
    }
    activate(sq);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const g = toGrid(e.clientX, e.clientY);
    if (!g) return;
    const moved = drag.moved || Math.hypot(g.x - drag.x, g.y - drag.y) > 0.1;
    setDrag({ ...drag, ...g, moved });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return;
    const sq = pointToSquare(e.clientX, e.clientY);
    const d = drag;
    setDrag(null);
    if (!d.moved) return; // a tap: selection already toggled on pointer down
    if (sq && sq !== d.from && targets.has(sq)) {
      setDropped(d.id);
      tryMove(d.from, sq);
    }
  };

  // ------------------------------------------------------------ keyboard

  const onKeyDown = (e: React.KeyboardEvent) => {
    const { col, row } = screen(cursor, orientation);
    const step: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (step[e.key]) {
      e.preventDefault();
      const next = squareFromScreen(col + step[e.key][0], row + step[e.key][1], orientation);
      if (next) setCursor(next);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate(cursor);
    } else if (e.key === "Escape") {
      setSelected(null);
      setPromo(null);
    }
  };

  // ------------------------------------------------------------ render

  const checkSquare = useMemo(() => {
    if (!game.inCheck()) return null;
    return readBoard(game).find((p) => p.type === "k" && p.color === game.turn())?.square ?? null;
  }, [game]);

  const pos = (sq: Square) => screen(sq, orientation);
  const squareLabel = (sq: Square) => {
    const p = game.get(sq);
    return p ? `${sq}, ${p.color === "w" ? "white" : "black"} ${PIECE_NAME[p.type as PieceType]}` : sq;
  };

  return (
    <motion.div
      key={shake}
      animate={shake && !reduced ? { x: [0, -4, 4, -4, 4, -2, 0] } : undefined}
      transition={{ duration: dur.base }}
      className="w-full rounded-control bg-void p-[3px] shadow-[0_0_0_1px_rgba(255,255,255,0.07)]"
    >
      <div
        ref={boardRef}
        role="grid"
        aria-label={`Chess board, ${movable === "w" ? "white" : movable === "b" ? "black" : "nobody"} to move`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
        className="group/board relative aspect-square w-full touch-none select-none rounded-[11px] outline-none"
      >
        {/* Squares: rounded tiles with a 2px void gap, like the cells on every other board (D-050).
            Each grid cell is a full eighth so pieces line up exactly; the tile sits 1px inside it. */}
        <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
          {Array.from({ length: 64 }, (_, i) => {
            const sq = squareFromScreen(i % 8, Math.floor(i / 8), orientation)!;
            const light = isLight(sq);
            const last = lastMove && (lastMove.from === sq || lastMove.to === sq);
            const target = targets.get(sq);
            const { col, row } = pos(sq);
            return (
              <div
                key={sq}
                role="gridcell"
                aria-label={squareLabel(sq)}
                aria-selected={selected === sq}
                className="relative"
              >
                <div className={`absolute inset-px overflow-hidden rounded-[6px] ${light ? "bg-square-light" : "bg-square-dark"}`}>
                  {last && <div className="absolute inset-0 bg-hue-chess opacity-[0.34]" />}
                  {selected === sq && <div className="absolute inset-0 rounded-[6px] bg-paper/[0.08] shadow-[inset_0_0_0_2px_var(--color-paper)]" />}
                  {checkSquare === sq && <div className="absolute inset-0 rounded-[6px] shadow-[inset_0_0_0_2px_var(--color-ember)]" />}
                  {hint && hint.from === sq && (
                    <motion.div
                      className="absolute inset-0 rounded-[6px] shadow-[inset_0_0_0_2px_var(--color-hue-chess)]"
                      animate={reduced ? undefined : { opacity: [1, 0.35, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                  {cursor === sq && <div className="absolute inset-0 hidden rounded-[6px] shadow-[inset_0_0_0_1px_var(--color-paper)] group-focus-visible/board:block" />}
                  {target && !target.capture && <div className="absolute left-1/2 top-1/2 h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-void/40" />}
                  {target && target.capture && <div className="absolute inset-[6%] rounded-full shadow-[inset_0_0_0_3px_rgba(0,0,0,0.45)]" />}
                  {col === 0 && <span className="pointer-events-none absolute left-[7%] top-[5%] font-mono text-[9px] leading-none text-fog/60">{sq[1]}</span>}
                  {row === 7 && <span className="pointer-events-none absolute bottom-[5%] right-[8%] font-mono text-[9px] leading-none text-fog/60">{sq[0]}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hint arrow */}
        {hint?.to && <HintArrow from={pos(hint.from)} to={pos(hint.to)} />}

        {/* Pieces */}
        <AnimatePresence initial={false}>
          {pieces.map((p) => {
            const { col, row } = pos(p.square);
            const dragging = drag?.id === p.id && drag.moved;
            const instant = dropped === p.id;
            return (
              <motion.div
                key={p.id}
                className="pointer-events-none absolute left-0 top-0 h-[12.5%] w-[12.5%]"
                style={dragging ? { zIndex: 20 } : { zIndex: 10 }}
                initial={{ opacity: 0, scale: 0.6, x: `${col * 100}%`, y: `${row * 100}%` }}
                animate={
                  dragging
                    ? { opacity: 1, scale: 1.12, x: `${(drag.x - 0.5) * 100}%`, y: `${(drag.y - 0.5) * 100}%` }
                    : { opacity: 1, scale: 1, x: `${col * 100}%`, y: `${row * 100}%` }
                }
                exit={{ opacity: 0, scale: 0.8, transition: { duration: dur.fast, ease: ease.in } }}
                transition={dragging || instant || reduced ? { duration: 0 } : { duration: dur.base, ease: ease.out }}
              >
                <Piece type={p.type} color={p.color} className="h-full w-full p-[3%]" />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Correct / wrong badge on the target square */}
        <AnimatePresence>
          {marker && (
            <motion.div
              key={`${marker.square}-${marker.kind}`}
              className="pointer-events-none absolute left-0 top-0 z-30 h-[12.5%] w-[12.5%]"
              style={{ transform: `translate(${pos(marker.square).col * 100}%, ${pos(marker.square).row * 100}%)` }}
            >
              <motion.span
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: dur.base, ease: ease.spring }}
                className={`absolute right-[4%] top-[4%] flex h-[38%] w-[38%] items-center justify-center rounded-full font-mono text-[12px] font-bold shadow-[0_2px_6px_rgba(0,0,0,0.5)] ${
                  marker.kind === "wrong" ? "bg-ember text-void" : "bg-paper text-void"
                }`}
              >
                {marker.kind === "wrong" ? "×" : "✓"}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Promotion picker, stacked from the edge on the target file */}
        {promo && (
          <div className="absolute inset-0 z-40 bg-void/55" onPointerDown={(e) => { e.stopPropagation(); setPromo(null); }}>
            {(["q", "n", "r", "b"] as const).map((t, i) => {
              const { col, row } = pos(promo.to);
              const top = row === 0 ? i : 7 - i;
              return (
                <button
                  key={t}
                  type="button"
                  aria-label={`promote to ${PIECE_NAME[t]}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    const m = promo;
                    setPromo(null);
                    setSelected(null);
                    onMove({ from: m.from, to: m.to, promotion: t });
                  }}
                  className="absolute h-[12.5%] w-[12.5%] rounded-[10px] bg-graphite p-[6%] shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_6px_16px_rgba(0,0,0,0.6)] transition-transform duration-[var(--dur-fast)] hover:scale-105"
                  style={{ left: `${col * 12.5}%`, top: `${top * 12.5}%` }}
                >
                  <Piece type={t} color={movable ?? "w"} className="h-full w-full" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function HintArrow({ from, to }: { from: { col: number; row: number }; to: { col: number; row: number } }) {
  const x1 = from.col + 0.5;
  const y1 = from.row + 0.5;
  const x2 = to.col + 0.5;
  const y2 = to.row + 0.5;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  // Stop the shaft short of the head so the tip lands on the square centre.
  const sx = x2 - ux * 0.32;
  const sy = y2 - uy * 0.32;
  const head = `${x2},${y2} ${sx - uy * 0.22},${sy + ux * 0.22} ${sx + uy * 0.22},${sy - ux * 0.22}`;
  return (
    <motion.svg
      viewBox="0 0 8 8"
      className="pointer-events-none absolute inset-0 z-[15] h-full w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.85 }}
      transition={{ duration: dur.base, ease: ease.out }}
      aria-hidden
    >
      <line x1={x1} y1={y1} x2={sx} y2={sy} stroke="var(--color-hue-chess)" strokeWidth={0.16} strokeLinecap="round" />
      <polygon points={head} fill="var(--color-hue-chess)" />
    </motion.svg>
  );
}
