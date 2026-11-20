import type { GameId } from "@/games/registry";

/** Small glyphs drawn on a 20×20 grid, monochrome via currentColor. Also drawn into the link previews (src/lib/og.tsx). */
export const glyphs: Record<GameId, React.ReactNode> = {
  path: <path d="M4 4h12v4H4v4h12v4H4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  balance: (
    <>
      <circle cx="6" cy="10" r="3.4" fill="currentColor" />
      <circle cx="14" cy="10" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  blocks: (
    <>
      <rect x="3" y="3" width="8" height="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13" y="3" width="4" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="11" width="8" height="6" fill="currentColor" />
    </>
  ),
  weave: (
    <>
      <path d="M5 5l5 5-5 5M10 10h5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
      <circle cx="15" cy="10" r="1.8" fill="currentColor" />
    </>
  ),
  recall: (
    <>
      <rect x="3" y="3" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11" y="3" width="6" height="6" fill="currentColor" />
      <rect x="3" y="11" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11" y="11" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  sudoku: (
    <>
      <rect x="3" y="3" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3v14M12 3v14M3 8h14M3 12h14" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <rect x="12.6" y="3.6" width="3.8" height="3.8" fill="currentColor" />
    </>
  ),
  chess: (
    <path
      d="M5 17.2h10.2v-1.6c.2-4.6-1.4-9.2-6-9.8L8.6 3.6 7.4 5.9 3.6 9.8c-.6.9-.1 2.1 1 2.3 1.3.2 2.6-.5 3.7-1.1-1.9 1.4-3.3 3-3.3 4.9z"
      fill="currentColor"
    />
  ),
  trivia: (
    <>
      <path d="M6.5 7a3.5 3.5 0 1 1 5 3.2c-1 .5-1.5 1.1-1.5 2.3v.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="9" y="15" width="2" height="2" fill="currentColor" />
    </>
  ),
};

/** The two stops of a game's deep colour (D-073), as custom properties for `.game-surface`. */
export const gameColours = (id: GameId) =>
  ({ "--deep": `var(--color-deep-${id})`, "--deeper": `var(--color-deeper-${id})` }) as React.CSSProperties;

/** The game's identity hue as a CSS value, for inline styles and SVG fills. */
export const hue = (id: GameId) => `var(--color-hue-${id})`;

/** A bright squircle tile with a black glyph, Dialed style. */
export function GameIcon({ id, size = 40 }: { id: GameId; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center text-void shadow-[var(--shadow-tile)]"
      style={{ width: size, height: size, borderRadius: size * 0.3, background: hue(id) }}
      aria-hidden
    >
      <svg viewBox="0 0 20 20" width={size * 0.55} height={size * 0.55}>
        {glyphs[id]}
      </svg>
    </span>
  );
}
