/**
 * Mind Bend's own chess pieces: chunky, low silhouettes on a 40×40 grid that share one rounded
 * base, so the set reads as a family and sits with the rounded tiles on every other board (D-050).
 *
 * Each piece is drawn twice: the silhouette stroked in the edge colour, then filled on top, so only
 * a clean outer edge shows (no seams where the parts overlap). White is paper with a void edge,
 * black is void with a fog edge. Pure SVG, no assets.
 */
import type { ReactNode } from "react";

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type PieceColor = "w" | "b";

const BASE = <rect x="7" y="30" width="26" height="5.5" rx="2.75" />;

const SHAPES: Record<PieceType, ReactNode> = {
  p: (
    <>
      {BASE}
      <path d="M11 30.5C12.5 26.5 14.6 24.2 16 22.8H24C25.4 24.2 27.5 26.5 29 30.5Z" />
      <circle cx="20" cy="17" r="6.6" />
    </>
  ),
  r: (
    <>
      {BASE}
      <path d="M10.5 30.5L12 15H28L29.5 30.5Z" />
      <path d="M9 7.6C9 6.7 9.7 6 10.6 6H13.4C14.3 6 15 6.7 15 7.6V9.6H17.6V7.6C17.6 6.7 18.3 6 19.2 6H20.8C21.7 6 22.4 6.7 22.4 7.6V9.6H25V7.6C25 6.7 25.7 6 26.6 6H29.4C30.3 6 31 6.7 31 7.6V14.4C31 15.3 30.3 16 29.4 16H10.6C9.7 16 9 15.3 9 14.4Z" />
    </>
  ),
  b: (
    <>
      {BASE}
      <path d="M13 30.5C13.6 28.4 14.6 27.2 15.6 26.4H24.4C25.4 27.2 26.4 28.4 27 30.5Z" />
      <path d="M20 7.2C26.4 10.8 29.4 16.4 27.8 21.8C27 24.4 25.4 26 24.4 26.8H15.6C14.6 26 13 24.4 12.2 21.8C10.6 16.4 13.6 10.8 20 7.2Z" />
      <circle cx="20" cy="5.4" r="2.6" />
    </>
  ),
  n: (
    <>
      {BASE}
      <path d="M11 30.5C11 25.6 13.4 22.6 17 20.4C15 21.2 12.6 21.4 10.6 20.4C8.4 19.2 8 16.6 9.4 14.8L16.4 7.6L17 4.2L20 6.8C27.8 7.4 31.6 14 30.4 30.5Z" />
    </>
  ),
  q: (
    <>
      {BASE}
      <path d="M10.6 30.5L8 12.8L14.2 20.2L15.4 9.8L20 18.4L24.6 9.8L25.8 20.2L32 12.8L29.4 30.5Z" />
      <circle cx="8" cy="11.4" r="2.5" />
      <circle cx="15.4" cy="8.2" r="2.5" />
      <circle cx="24.6" cy="8.2" r="2.5" />
      <circle cx="32" cy="11.4" r="2.5" />
    </>
  ),
  k: (
    <>
      {BASE}
      <path d="M11 30.5C9.2 25.4 8.4 21 10 18.2C11.8 15 16.4 14.6 20 17.6C23.6 14.6 28.2 15 30 18.2C31.6 21 30.8 25.4 29 30.5Z" />
      <path d="M18.3 3.6C18.3 3 18.8 2.5 19.4 2.5H20.6C21.2 2.5 21.7 3 21.7 3.6V6.3H24.4C25 6.3 25.5 6.8 25.5 7.4V8.6C25.5 9.2 25 9.7 24.4 9.7H21.7V14.6H18.3V9.7H15.6C15 9.7 14.5 9.2 14.5 8.6V7.4C14.5 6.8 15 6.3 15.6 6.3H18.3Z" />
    </>
  ),
};

/** Small cuts drawn in the edge colour on top of the fill: the bishop's slit, the knight's eye, the queen's band. */
const DETAIL: Partial<Record<PieceType, ReactNode>> = {
  b: <path d="M23.4 12.4L19.2 18.2" strokeWidth="2" strokeLinecap="round" fill="none" />,
  n: <circle cx="18.6" cy="12" r="1.5" stroke="none" />,
  q: <path d="M12.6 25.4H27.4" strokeWidth="1.6" strokeLinecap="round" fill="none" />,
};

const STYLE: Record<PieceColor, { fill: string; edge: string; width: number }> = {
  w: { fill: "var(--color-paper)", edge: "var(--color-void)", width: 2.4 },
  b: { fill: "var(--color-void)", edge: "var(--color-fog)", width: 2.6 },
};

export const PIECE_NAME: Record<PieceType, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

function Layers({ type, color }: { type: PieceType; color: PieceColor }) {
  const s = STYLE[color];
  return (
    <>
      <g fill={s.edge} stroke={s.edge} strokeWidth={s.width} strokeLinejoin="round">
        {SHAPES[type]}
      </g>
      <g fill={s.fill}>{SHAPES[type]}</g>
      <g fill={s.edge} stroke={s.edge}>
        {DETAIL[type]}
      </g>
    </>
  );
}

/** One piece as an SVG filling its box. */
export function Piece({ type, color, className }: { type: PieceType; color: PieceColor; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <Layers type={type} color={color} />
    </svg>
  );
}

/** A piece placed inside another SVG (card art, intro drawings): x, y and size in the parent's units. */
export function PieceAt({ type, color, x, y, size }: { type: PieceType; color: PieceColor; x: number; y: number; size: number }) {
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <Layers type={type} color={color} />
    </svg>
  );
}
