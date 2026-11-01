# Changelog

## Unreleased

- **Clearer start screens** (D-045): numbered eyebrows for mode and difficulty, segmented controls with a visible stroke and a filled active chip, a compact one-row record panel, and "how to play" as a ghost pill beside the play button. The tier control dims when daily or a challenge fixes it.
- **Cell outlines** on path, balance, blocks and sudoku: every cell now has a 1px outline at 3.3:1 so empty cells read on the card. The selected sudoku cell and a hint's related cells swap the outline colour instead of adding a second ring (D-043). New token `--color-cell-line`.
- **Sudoku is 6×6 at every tier** (D-044). Difficulty now comes from the starting numbers: 18 on easy, 14 on medium, 12 on hard, 9 on expert, all solvable with simple steps only. Pars are 45s, 75s, 2 min and 3 min. Daily and challenge boards for sudoku change from this release.
- **New home hero** (D-042): a field of floating mini boards from all seven games with pointer parallax, a big mono headline, the daily set in front with a live countdown to the next set, and the week's difficulty ramp. Hovering a game in the set lights its boards in the background.
- The "you" card now runs horizontally under the hero.
- Repo: CI on every push and pull request (lint, typecheck, tests, build), Dependabot, issue and PR templates, MIT licence for the code, `.editorconfig`, `.nvmrc`, `typecheck` and `check` scripts, and a README with screenshots and architecture notes.

## 0.7.0 · 2026-10-30 · Dialed redesign, score history, stats

- **Redesign** after Dialed: raised gradient cards with layered shadows, a bright hue and squircle icon tile per game, card art with tilted mini boards that lift on hover, white primary pills, a bento game grid (D-037, D-038).
- **Score history:** every game is saved in the browser with its tier, mode, seed, time or points and hints. Ratings, bests, streaks and solve rates are derived from it. v0.6 totals are migrated once. Tabs stay in sync (D-039).
- **Stats page** (`/stats`): totals, training-days calendar, skill bars, per-game rating chart with tier thresholds and hover, bests per tier, recent games with rating change.
- **Transfer code** to move history to another device, merged without duplicates. Reset with a two-step confirm.
- **Scores with a purpose:** start card opens on your suggested tier with progress to the next; result screen shows rank, change vs your average, rating bar animating to the next tier and level-ups that move your next board up; home "next up" suggestion; greeting with your streak (D-040).
- Hints now cost rating (15% each, floor 40%). Leaving a started board counts as a quit (D-041).
- "next daily game" jumps to the first daily board you haven't finished.

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
