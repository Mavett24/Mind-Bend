/**
 * Mind Bend's own chess pieces: flat geometric silhouettes on a 40×40 grid, drawn to sit with
 * Geist Mono and the raised cards rather than to look like a wooden Staunton set.
 * White pieces are paper with a black edge, black pieces are near-black with a chalk edge,
 * so both read on the light and the dark squares. Pure SVG, no assets.
 */
import type { ReactNode } from "react";

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type PieceColor = "w" | "b";

const BASE = <rect x="9.5" y="30.5" width="21" height="4" rx="2" />;
const COLLAR = <rect x="13" y="27" width="14" height="2.8" rx="1.4" />;

const SHAPES: Record<PieceType, (detail: string) => ReactNode> = {
  p: () => (
    <>
      <rect x="10.5" y="30.5" width="19" height="4" rx="2" />
      <path d="M15.6 20.6C16.4 24.2 15.2 27.8 13.2 30.5H26.8C24.8 27.8 23.6 24.2 24.4 20.6Z" />
      <rect x="14.6" y="18.2" width="10.8" height="2.6" rx="1.3" />
      <circle cx="20" cy="12.6" r="5.2" />
    </>
  ),
  r: () => (
    <>
      {BASE}
      <rect x="11.5" y="27.4" width="17" height="3.2" rx="1" />
      <path d="M14.2 27.4L15.2 15.2H24.8L25.8 27.4Z" />
      <rect x="12.5" y="12.6" width="15" height="2.8" rx="1" />
      <path d="M12.5 12.6V6.5H16V9H18.3V6.5H21.7V9H24V6.5H27.5V12.6Z" />
    </>
  ),
  b: (detail) => (
    <>
      <rect x="10.5" y="30.5" width="19" height="4" rx="2" />
      <rect x="14.5" y="26.6" width="11" height="2.8" rx="1.4" />
      <path d="M15.8 29.4H24.2L23 26.6H17Z" />
      <path d="M20 7.6C25.6 11.2 27.6 16 26.1 20.6C25.1 23.6 23.2 25.6 22.6 26.6H17.4C16.8 25.6 14.9 23.6 13.9 20.6C12.4 16 14.4 11.2 20 7.6Z" />
      <circle cx="20" cy="5.4" r="2.2" />
      <path d="M23 12.2L19.3 17.6" fill="none" stroke={detail} strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  n: (detail) => (
    <>
      {BASE}
      <path d="M12.6 30.5C12.6 25.4 15.4 22.4 19.2 19.8C17.4 20.8 14.6 21.2 12.6 20.2C10.5 19.2 10 17.1 11.1 15.5L17.8 9.2L18.4 5.4L21.2 8C27.4 8.6 30.8 14.4 29.6 30.5Z" />
      <circle cx="19.4" cy="12.6" r="1.2" fill={detail} stroke="none" />
      <path d="M24.4 11.4C26.8 14.6 27.3 20.4 26.3 26.4" fill="none" stroke={detail} strokeWidth="1" strokeLinecap="round" opacity="0.55" />
    </>
  ),
  q: () => (
    <>
      {BASE}
      {COLLAR}
      <path d="M13.5 27L10.2 13.6L14.8 19.8L15 10.6L18.3 18.6L20 9L21.7 18.6L25 10.6L25.2 19.8L29.8 13.6L26.5 27Z" />
      <circle cx="10.2" cy="12" r="1.8" />
      <circle cx="15" cy="9" r="1.8" />
      <circle cx="20" cy="7.4" r="1.8" />
      <circle cx="25" cy="9" r="1.8" />
      <circle cx="29.8" cy="12" r="1.8" />
    </>
  ),
  k: () => (
    <>
      {BASE}
      {COLLAR}
      <path d="M13.6 27C12.1 22.2 11.1 18.6 12.6 16.1C14.1 13.6 17.6 13.6 20 16.2C22.4 13.6 25.9 13.6 27.4 16.1C28.9 18.6 27.9 22.2 26.4 27Z" />
      <path d="M18.6 3.4H21.4V6.2H24V9H21.4V13.6H18.6V9H16V6.2H18.6Z" />
    </>
  ),
};

const STYLE: Record<PieceColor, { fill: string; stroke: string; detail: string }> = {
  w: { fill: "var(--color-paper)", stroke: "#0a0a0a", detail: "#0a0a0a" },
  b: { fill: "#161616", stroke: "var(--color-chalk)", detail: "var(--color-chalk)" },
};

export const PIECE_NAME: Record<PieceType, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

/** One piece as an SVG filling its box. */
export function Piece({ type, color, className }: { type: PieceType; color: PieceColor; className?: string }) {
  const s = STYLE[color];
  return (
    <svg viewBox="2 1.5 36 36" className={className} aria-hidden>
      <g fill={s.fill} stroke={s.stroke} strokeWidth={color === "w" ? 1.5 : 1.3} strokeLinejoin="round">
        {SHAPES[type](s.detail)}
      </g>
    </svg>
  );
}

/** A piece placed inside another SVG (card art, intro drawings): x, y and size in the parent's units. */
export function PieceAt({ type, color, x, y, size }: { type: PieceType; color: PieceColor; x: number; y: number; size: number }) {
  const s = STYLE[color];
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="2 1.5 36 36" aria-hidden>
      <g fill={s.fill} stroke={s.stroke} strokeWidth={color === "w" ? 1.5 : 1.3} strokeLinejoin="round">
        {SHAPES[type](s.detail)}
      </g>
    </svg>
  );
}
