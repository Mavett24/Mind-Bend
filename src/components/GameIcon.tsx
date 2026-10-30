import type { GameId } from "@/games/registry";

/** Small glyphs drawn on a 20×20 grid, monochrome via currentColor. */
const glyphs: Record<GameId, React.ReactNode> = {
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
  trivia: (
    <>
      <path d="M6.5 7a3.5 3.5 0 1 1 5 3.2c-1 .5-1.5 1.1-1.5 2.3v.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="9" y="15" width="2" height="2" fill="currentColor" />
    </>
  ),
};

export function GameIcon({ id, size = 32 }: { id: GameId; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-iron text-paper"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 20 20" width={size * 0.56} height={size * 0.56}>
        {glyphs[id]}
      </svg>
    </span>
  );
}
