# Roadmap

## Phase 1 · Foundation
- [x] Product brief, design system, game specs, decision log
- [x] Next.js app with design tokens and fonts
- [x] Seeded RNG, daily seeds, difficulty tiers, skill rating, local storage, with tests
- [x] Home screen and the shared game frame
- [x] First deploy on Vercel: https://mind-bend.vercel.app

## Phase 2 · Engine and first two games
- [x] Shared game flow: start card, play, result screen, share link, stats
- [x] path: generator, solver, uniqueness tests, board UI
- [x] balance: generator, solver, uniqueness tests, board UI

## Phase 3 · Spatial and memory
- [x] blocks
- [x] recall

## Phase 4 · Words and knowledge
- [x] weave with curated dictionary
- [x] trivia: higher or lower dataset, categories question bank
- [ ] Hand-curate trivia questions (typos, obscure items), or build from Open Trivia DB (D-028)

## Phase 4.5 · Playtest fixes
- [x] How-to-play screen and plain-language difficulty for every game
- [x] Hints with cooldown: path, balance (with explanations), weave
- [x] weave matches Wend: no diagonals, empty tiles, length slots
- [x] recall UI rework

## Phase 4.6 · Sudoku
- [x] sudoku: generator, logic solver, grading, hints, board UI
- [x] sudoku: 6×6 at every tier, difficulty by givens (D-044)

## Phase 5 · Score tracking, stats and redesign
- [x] History of every game played, derived ratings, bests, streaks, solve rates
- [x] Stats page with rating charts, calendar, skills, recent games
- [x] Scores that steer play: suggested tier, tier progress, level-ups, next-up suggestion
- [x] Transfer code between devices
- [x] Dialed-inspired visual redesign: raised cards, game hues, card art, white pills
- [ ] Optional cloud sync (free Vercel database) on the same record format

## Phase 6 · Polish
- [x] Cell outlines at 3:1 on every logic board (D-043)
- [ ] Motion pass on every signature moment (see DESIGN.md §6)
- [ ] Sound and haptics
- [ ] Accessibility audit, keyboard play for every board
- [ ] Performance pass on low-end phones

## Phase 7 · Case study
- [ ] Screen recordings of each game and signature moment
- [ ] Metrics: generator speed, uniqueness test counts, Lighthouse scores
- [ ] Write-up from DECISIONS.md
