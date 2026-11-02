/** Motion tokens for motion/react, mirroring the CSS tokens in globals.css and DESIGN.md §6. */

export const ease = {
  out: [0.22, 1, 0.36, 1],
  in: [0.5, 0, 0.7, 0.4],
  spring: [0.34, 1.56, 0.4, 1],
  springStrong: [0.26, 1.45, 0.38, 1],
} as const;

export const dur = {
  fast: 0.12,
  base: 0.24,
  slow: 0.48,
  count: 0.9,
} as const;

/** Scroll reveal (DESIGN.md §6, D-052): rise and fade once, left to right across a row. */
export const reveal = {
  /** px the element rises while it fades in */
  rise: 16,
  /** extra delay across one full row, spread by horizontal position */
  rowStagger: 0.16,
  /** share of the element that must be on screen before it plays */
  amount: 0.2,
} as const;

/** Press feedback: the scale an element compresses to while held. */
export const press = {
  button: 0.97,
  card: 0.98,
} as const;

/** Signature moment 7, the wrong-move shake: 4px, three cycles, `dur.base` in total. */
export const shake = {
  x: [0, -4, 4, -4, 4, -4, 4, 0],
  duration: dur.base,
} as const;

/** Card art parallax: px the mini board travels across one viewport of scroll (desktop only). */
export const parallax = {
  cardArt: 14,
} as const;
