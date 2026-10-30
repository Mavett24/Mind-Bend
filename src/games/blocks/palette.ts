/**
 * Board palette for blocks (DESIGN.md §2: colour lives inside the board).
 * Based on the Okabe-Ito colour-blind-safe set, lifted for a dark board. Every hue clears
 * 5.9:1 against --color-graphite. Each clue also carries a shape glyph, so colour is never the only signal.
 */
export const BLOCKS_PALETTE = [
  "#E69F00", // orange
  "#56B4E9", // sky
  "#2BC48F", // green
  "#F0E442", // yellow
  "#5B95F7", // blue
  "#DE86B8", // pink
  "#A890FF", // violet
  "#7FD8C4", // mint
] as const;
