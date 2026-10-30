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
