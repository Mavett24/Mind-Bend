# chess

**Skill:** tactics · **Inspired by:** chess.com puzzles · **Status:** live (v0.8)

Tactics puzzles with a puzzle rating, the way chess.com runs them: you play the side to move, find the best move, and every puzzle moves your rating against the puzzle's own rating. Practice is endless; the daily is a set of three.

## Puzzles

- Source: the [Lichess puzzle database](https://database.lichess.org/#puzzles), CC0. Every puzzle there was found by Stockfish in a real game and is rated by how players do on it (D-046).
- `scripts/build-chess.mjs` keeps puzzles with a settled rating (deviation 90 or less), liked by players (popularity 80+), played 200+ times, with 1 to 6 player moves, and checks every move is legal with chess.js. Up to 2,000 per 200-point band, from 600 to 2800. 16,522 puzzles in v0.8.
- Bands are separate files in `public/data/chess/` (about 90 KB each over the wire), fetched on demand: a puzzle loads the band around its target and its neighbours.
- A test plays every solution in every band and checks the engine accepts it.

## Playing

1. The board shows the position, turned so your side is at the bottom. After a beat, the opponent's setup move plays and lights up. The clock starts.
2. Drag a piece, or tap it and tap a square. Legal moves show as dots, captures as rings. Pawns reaching the last rank open a picker (queen, knight, rook, bishop).
3. The right move gets a ✓ badge. If the line goes on, the opponent replies after 420 ms and you find the next move.
4. The puzzle is solved when the line ends. Any move that mates counts, even if the database line has a different mating move.
5. A wrong move plays on the board with an ember × badge and a shake, then the board steps back so you can see the position again. The puzzle is lost.

After a loss: **retry** replays it from the start (never rated), **solution** plays the line move by move, **next** moves on. After a solve: **next**, **share** (a challenge link to this exact puzzle) and back to the menu.

Keys: arrows move a cursor, enter or space picks up and drops, escape cancels.

## Rating

Puzzle Elo, separate from the 1000-based ratings of the other games (D-048).

- Start at **1200**. Each rated puzzle is a game against the puzzle's rating.
- Win: `K × (1 − expected)`, at least +1 for a clean solve. Loss: `−K × expected`.
- K is 64 for your first 10 rated puzzles, 40 up to 30, then 24. An even puzzle is worth ±12 once settled.
- **Hints:** the first hint lights the piece to move and halves what you win. The second draws the move and you win nothing. Hints never cost rating on their own. Same 5 s cooldown as the other games.
- **Speed bonus:** each puzzle has a target time from its rating and length: 11 s + 14 ms per rating point above 500 for the first move, plus 6 s per extra move (about 18 s for a one-mover at 1000, 32 s at 2000). Solve in half the target or less for +4, fading to 0 at twice the target. A chip by the clock shows what you'd get right now. Hints turn it off.
- A puzzle is rated once: the first time you meet it. Retries, replays and puzzles seen before (practice never serves them again unless the pool runs dry) are unrated.
- Leaving a puzzle mid-way after 5 s is a quit, as in every game: recorded, never rated (D-041).
- Ratings clamp to 100 to 3300.

## Modes

| Mode | Puzzles | Rated |
|------|---------|-------|
| Practice | Endless, each near your rating plus the tier offset, ±60 for variety | First attempt at each puzzle |
| Daily | Three, at about 1300, 1700 and 2100. Same for everyone (seeded by the date) | Yes, first attempt only (D-049) |
| Challenge | The exact puzzle in the link (`?s=<band>-<id>`), then practice | First attempt |

The daily set counts as done once all three are played, solved or not. It ends on a summary: 0/3 to 3/3, each puzzle's rating change, the total, and the link to the next daily game.

## Difficulty

Tiers are offsets from your rating, like chess.com's easier and harder settings. Medium is always the suggestion.

| Tier | Puzzles around |
|------|----------------|
| easy | your rating − 300 |
| medium | your rating |
| hard | your rating + 200 |
| expert | your rating + 400 |

The start card shows rating, peak, played and solved, with a bar to the next hundred ("63 to 1500") instead of the tier bar.

## Visuals

- Hue: violet `--color-hue-chess` `#c084fc`.
- Board: violet-tinted squares `--color-square-light` `#5d5672` and `--color-square-dark` `#39334a` (D-047), coordinates in the opposite square colour, 10 px mono.
- Pieces: Mind Bend's own flat set (`src/games/chess/pieces.tsx`). White is paper with a black edge, black is near-black with a chalk edge, so both read on both squares.
- Last move: hue at 32% over both squares. Selected piece: paper at 16%. King in check: 3 px ember inset ring. Hint: 3 px hue ring that pulses, then a hue arrow.
- Pieces glide between squares (240 ms, `--ease-out`), captured pieces fade and shrink, a dropped piece lands without gliding. Reduced motion: no glide, no shake, no pulse.
- Squares are about 42 px on a 390 px phone: the board fills the card edge to edge, the card padding drops to 12 px for it. That is under the 44 px target (D-047).

## Lines

| Result | Lines |
|--------|-------|
| Clean and fast (speed bonus) | That's the move. · Saw it straight away. · Clean. · No notes. |
| Solved | Found it. · Got there. · Correct, and it counts. · The board agrees. |
| Solved with hints | Solved, with a nudge. · Hints spent, line found. · Teamwork. |
| Lost | Not the move. · The board had other plans. · Close. The board disagrees. · That one bites back. |

After a puzzle, chips show the puzzle rating, the speed bonus, the hint cost and up to three themes in plain words (fork, pin, mate in 2, endgame).

## Not yet

- Puzzle Rush style timed runs and a puzzle streak mode.
- Choosing themes to practise (forks only, mates only).
- Sound for moves and captures (Phase 6 sound pass).
- Premoves.
