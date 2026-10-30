# Mind Bend: Product Brief

## One line

Logic puzzles, memory games and trivia in one app, with daily challenges, infinite practice and adaptive difficulty.

## Problem

Good daily brain games exist, but they are scattered across platforms and they stop when the day's puzzle is done. LinkedIn's logic games give you one board a day at a fixed difficulty. Dialed tests sensory memory beautifully but covers one skill family. Trivia sites like Lessgames are a separate tab again. Nobody who wants to actually get better at these skills can practise them deliberately in one place.

## Who it is for

People who already play daily puzzles and want more of them: more boards, harder boards, and a sense of whether they are improving. The primary user is me. Secondary users are friends I send challenge links to.

## Product principles

1. **Never the same board twice.** Every puzzle is generated, not authored. Variance is the product.
2. **Every puzzle is fair.** Logic puzzles always have exactly one solution, reachable by deduction without guessing. A generator that cannot prove uniqueness throws the board away.
3. **Difficulty you can feel.** Tiers change the reasoning required, not just the grid size.
4. **Improvement is visible.** Each game tracks a skill rating and suggests your next difficulty, so you stay in the zone between bored and overwhelmed.
5. **Zero friction.** No account, no install, no loading screens. Open, pick, play.
6. **The card is the stage.** One focused surface per game, the same frame for every game, motion that makes every action feel physical.

## Core loop

Pick a game → pick Daily or Practice → pick a difficulty (or accept the suggested one) → play → result screen with score, time, a line of copy for the score band, and a share link → play again or switch game.

## Modes

| Mode | What it is | Seed |
|------|-----------|------|
| Daily | One board per game per day, same for everyone, fixed difficulty ramp across the week | Date + game id |
| Practice | Infinite boards at any difficulty | Random |
| Challenge | A specific board shared by link, so a friend plays exactly what you played | In the URL |

All three run through the same seeded generator, so they are one mechanism, not three features.

## Difficulty

Four tiers: Easy, Medium, Hard, Expert. Each game spec defines what a tier changes (grid size, clue density, deduction depth, time pressure, stimulus duration).

A per-game skill rating (Elo-style, starting at 1000) moves after every practice game based on result and time. The app suggests the tier that matches the rating. The user can always override it.

## Game lineup (v1)

| Game | Skill | Inspired by | Status |
|------|-------|-------------|--------|
| Path | Route planning | LinkedIn Zip | Planned |
| Balance | Binary deduction | LinkedIn Tango | Planned |
| Blocks | Spatial partitioning | LinkedIn Patches | Planned |
| Weave | Word finding | LinkedIn Wend | Planned |
| Recall | Sensory memory | Dialed | Planned |
| Trivia | Knowledge | Lessgames | Planned |

Names are working titles. Mechanics are inspired by these games; names, visuals and content are our own. Each game has a spec in `docs/games/`.

## Scope

**In v1:** six games, daily + practice + challenge links, four tiers, local stats and skill rating, desktop and mobile web, sound and haptics on supported devices.

**Not in v1:** accounts, global leaderboards, multiplayer, native apps, monetisation. Leaderboards can come later through a free backend tier if the app earns it.

## Success criteria

- Every generated logic board passes the uniqueness check in automated tests (thousands of seeds per tier).
- First interaction within 2 seconds on a mid-range phone.
- I play it daily for two weeks without being bored by repetition.
- Friends complete a shared challenge link without needing instructions.

## Tech

Next.js, TypeScript, Tailwind CSS v4, Motion. Pure TypeScript game engine, separate from UI, unit-tested with Vitest. State and stats in localStorage. Hosted on Vercel's free tier, deployed from this repo.
