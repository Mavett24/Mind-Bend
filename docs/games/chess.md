# chess

**Skill:** tactics · **Inspired by:** chess.com puzzles · **Status:** live (v0.8), Puzzle Rush (D-071)

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
| Rush | As many as you can in 3 or 5 minutes, three mistakes and it's over (below) | Never |

The daily set counts as done once all three are played, solved or not. It ends on a summary: 0/3 to 3/3, each puzzle's rating change, the total, and the link to the next daily game.

## Puzzle Rush

Chess.com's Puzzle Rush, on our puzzle set (D-071). Pick 3 or 5 minutes on the start card.

- Puzzles come one after another on the same board. A solve scores a point and moves on at once (260 ms); a wrong move crosses out a life, shakes the board and moves on (620 ms). The third wrong move, or the clock reaching zero, ends the run. "end run" ends it early and still counts.
- The clock starts when the first puzzle's setup move has played and doesn't stop between puzzles. Setup moves (320 ms) and replies (260 ms) are quicker than in practice. The clock turns ember for the last 10 seconds.
- No hints and no speed bonus. The run never touches your puzzle rating.
- Leaving a run after 5 seconds is a quit: in your activity, never a best.

**The ramp** (`rushStep` in `src/games/chess/rush.ts`), by puzzle number:

| Puzzles | Target rating | Longest line | Only |
|---------|---------------|--------------|------|
| 1 to 5 | 600 to 740 | 1 move | mate in 1 (back rank mates among them) |
| 6 to 10 | 760 to 960 | 2 moves | mate in 1 or 2 |
| 11 to 20 | 1000 to 1450 | 2 moves | |
| 21 to 35 | 1500 to 2060 | 3 moves | |
| 36 on | +30 a puzzle, up to 2800 | 4 moves | |

Each step picks among the 24 unused puzzles closest to its target that fit, within 80 points, loosening to 160 points, then any theme, then anything, so a run never stalls. The pick is seeded by the run's seed and the puzzle number, never by how you're doing, so the same seed always gives the same run.

**The run screen:** score (counts up in hue), three lives, the clock, a strip of the last 16 puzzles as ✓ (hue) and × (ember) tiles, the board, the side to move with the puzzle number and rating.

**The end:** the score, why it ended (time's up, three strikes, run ended), a line against your best or the score to beat, best, missed and hardest solved, every puzzle as a chip with its rating, "rush again" (new seed, same length) and "challenge a friend".

**Review** (D-072): every puzzle on the end screen is a button ("tap a puzzle to replay it"). When the run had misses, the primary action is "review 3 mistakes"; rush again and challenge sit below it. A review replays the puzzle from its setup move, off the clock and unrecorded:

- Above the board: "review · mistake 1 of 3", the puzzle number and rating, and the hint button (piece, then the move as an arrow, 1.5 s cooldown).
- Below: what you played in the run ("in the run you played Ng5"). A wrong move shakes and steps back, and you try again as often as you like.
- **solution** plays the rest of the line from where you are. Once solved or shown, the themes appear and **replay** starts it over.
- **next mistake** moves through the misses in order (it reads **skip** before you've solved or seen the line), the last one says **results**. ← goes back to the results at any point.
- Reviewed misses turn from an ember × to a muted ↺ chip, and the button counts down ("review 1 more"). With nothing left to review, rush again is primary again. Solved puzzles open the same way, with "you solved this one in the run".

**Sharing:** `/play/chess?m=rush&r=<3|5>&s=<seed>&b=<score>` opens the start card on rush with the length locked and "beat 21" under it. The friend's seed is used once; "rush again" starts a fresh one.

**Records:** one per run, `mode: "rush"`, tier medium, seed `rush<minutes>-<seed>`, `score` = puzzles solved. Kept out of the puzzle rating, solve rate, bests and the daily (`gameSummary`, `puzzleBests`, `solvesAt`); `rushBests` gives the best per length.

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
- Board: rounded tiles with a 2 px void gap on a void panel, built like the cells on every other board (D-050). Light tiles are slate, dark tiles iron. Coordinates in 9 px mono, fog at 60%.
- Pieces: Mind Bend's own set (`src/games/chess/pieces.tsx`): chunky, low silhouettes on one shared rounded base. White is paper with a void edge, black is void with a fog edge, so both read on both tiles.
- Last move: hue at 34% over both tiles. Selected piece: 2 px paper ring. King in check: 2 px ember ring. Hint: 2 px hue ring that pulses, then a hue arrow.
- Pieces glide between squares (240 ms, `--ease-out`), captured pieces fade and shrink, a dropped piece lands without gliding. Reduced motion: no glide, no shake, no pulse.
- Tiles are about 41 px on a 390 px phone: the board fills the card edge to edge, the card padding drops to 12 px for it. That is under the 44 px target (D-047).

## Lines

| Result | Lines |
|--------|-------|
| Clean and fast (speed bonus) | That's the move. · Saw it straight away. · Clean. · No notes. |
| Solved | Found it. · Got there. · Correct, and it counts. · The board agrees. |
| Solved with hints | Solved, with a nudge. · Hints spent, line found. · Teamwork. |
| Lost | Not the move. · The board had other plans. · Close. The board disagrees. · That one bites back. |

After a puzzle, chips show the puzzle rating, the speed bonus, the hint cost and up to three themes in plain words (fork, pin, mate in 2, endgame).

## Not yet

- Puzzle Streak (no clock, one life, ramps the same way).
- A daily rush, the same run for everyone.
- Choosing themes to practise (forks only, mates only).
- Sound for moves and captures (Phase 6 sound pass).
- Premoves.
