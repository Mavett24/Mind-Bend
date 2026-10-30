# Changelog

## 0.6.0 · 2026-10-30 · Sudoku

- **sudoku** is playable: 6×6 on easy, 9×9 above. Tap a cell then a number, notes mode, row/column/box and same-number shading, instant clash marks, keyboard play (D-036).
- Generator gated by a logic solver (singles, pointing, claiming, pairs, triples, X-wing), graded by advanced steps per tier. 160 boards tested unique; hard and expert never solvable with singles alone.
- Explained hints with the 5 second cooldown, tested to solve every board on their own.
- How-to-play screen and tier lines for sudoku. New design token `--color-entry` for player-entered numbers.
- Fix: recall's ready step now shows once per game instead of before every round (D-035).

## 0.5.0 · 2026-10-30 · Hints, how to play, Wend-style weave, clearer recall

- **How to play** before every board: illustrated example, three steps, what the chosen difficulty means, controls, "skip next time" per game. "How to play" link on the start card (D-030).
- Every difficulty described in plain words under the tier picker (D-031).
- **path hints:** highlight the next correct cell, cutting the line back first if it went wrong. 5s cooldown (D-032).
- **balance hints:** outline the next forced cell and explain the rule in one sentence, or point out a wrong cell. Tested to solve every board on their own (D-033).
- **weave** now matches Wend: up/down/left/right only, scattered empty tiles, word-length slots that fill as you find words, hint reveals letters in the slots (D-034).
- **recall** reworked: a ready step per round, rounded gapped tiles, countdown in a readable pill, dashed outlines for hidden tiles, plain slider names (hue, vividness, brightness), round progress dots, clearer reveal with "/10" and what the difference means. Fixed the reveal split rendering black.
- Rules line under boards removed (the how-to-play screen covers it). Result screens show hints used.

## 0.4.0 · 2026-10-30 · Words and knowledge: all six games live

- **weave** is playable: trace hidden words through touching letters including diagonals, near-centre hit areas for clean diagonals, "a word, but not hidden here" feedback, hints, keyboard play. Generator tiles the grid exactly with non-crossing word paths (400 seeds tested). Strands-style matching (D-026).
- **trivia** is playable: higher or lower (population, GDP, area, cities, with sources) and categories (nine plus mixed), ten timed questions, speed-weighted points (D-027).
- Content pipeline: `scripts/build-data.mjs` builds word lists and trivia data from openly licensed sources (`scripts/DATA_SOURCES.md`, D-028).
- Boards can load content before starting, with a "building board" state and the clock starting when ready (D-029).
- Fix: weave length planning could loop forever on some grid sizes; it now only picks lengths that leave a fillable remainder (tested).
- Fix: weave paths could cross their own diagonals.
- Fix: the trivia time bar froze late instead of where you answered.

## 0.3.1 · 2026-10-30 · Blocks fixes

- Fix: tapping an empty cell no longer leaves a dashed 1×1 rectangle (D-025).
- Fix: dragging past the board edge stretches the rectangle to the edge instead of collapsing it.
- No preview flash on a plain tap.
- "Any shape" clues show a dashed square glyph instead of nothing.
- Rejected rectangles show their area, so you can see what you drew.
- Two-digit clues stack on 7×7 and 8×8 boards so they fit on small phones.
- Colouring spreads across the whole palette instead of reusing three or four hues.
- Gesture rules extracted to a pure `applyGesture` with 6 new tests.

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
