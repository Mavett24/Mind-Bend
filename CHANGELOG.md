# Changelog

## 0.3.0 · 2026-10-30 · Spatial and memory

- **blocks** is playable: drag to draw rectangles with a live area preview, tap to remove, keyboard support. Exact-cover solver proves every board unique (400 seeds tested). Colour-blind-safe palette with shape glyphs; touching rectangles never share a colour (D-024).
- **recall** is playable: five rounds of hold-and-rebuild, 1 to 4 colours depending on tier, OKLCH sliders, split reveal with ΔE and a line per round. CIEDE2000 scoring tested against published reference pairs (D-023).
- Shared flow supports scored games: points count up on the result screen, bests per tier, rating mapping that treats 4/10 or less as a loss (D-022). Clock hidden for scored games.
- Fix: board grids now force equal row heights, so drawn rectangles sit exactly on their cells.
- Fix: buttons no longer wrap on narrow phones.

## 0.2.0 · 2026-10-30 · First two games

- **path** is playable: drag to draw, drag back or tap to cut the line, keyboard support. Generator builds a random Hamiltonian path and rules out every alternative solution (D-017). 240 seeds tested unique.
- **balance** is playable: tap to cycle, keyboard support, rule breaks shown after a short pause, = / × links. Every board is solvable without guessing (D-018). 400 seeds tested unique by brute force.
- Shared play flow: in-game clock, solve ripple, result screen with count-up time, score line, best, rating change or streak, next board, share link.
- Results saved per game: bests per tier, rating (practice and challenge only, D-019), daily completions and streak.
- Daily set on the home screen ticks off finished games and marks upcoming ones as soon. "Next daily game" moves through the set.

## 0.1.1 · 2026-10-30 · Softer, more readable

- Soft corners throughout: 24px cards, 14px controls, 8px cells, pill buttons (D-014).
- Geist Mono for headings, labels and numbers, Geist Sans for body copy, both self-hosted (D-015). JetBrains Mono removed.
- Game title on the start card and home headline scaled down to 32px (D-016).
- Daily card ember border replaced with a small ember tick beside its label.

## 0.1.0 · 2026-10-30 · Foundation

- Product brief, design system (Axiom base with Dialed-inspired motion), six game specs, decision log, roadmap.
- Next.js 16 app with Tailwind v4 design tokens, Motion.
- Engine: seeded RNG, daily and practice seeds, difficulty tiers, Elo-style skill rating, safe local storage. Unit tested.
- Home screen with the daily card and game grid. Shared game frame with mode and difficulty pickers. Games show as in development.
