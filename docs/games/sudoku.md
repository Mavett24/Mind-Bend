# sudoku

**Skill:** number logic · **Inspired by:** LinkedIn Mini Sudoku and classic sudoku · **Status:** live (v0.6), 6×6 at every tier since D-044

## Rules

Fill every empty cell so each row, each column and each box holds every number exactly once. Every tier is a 6×6 grid with 2×3 boxes and the numbers 1 to 6, like LinkedIn Mini Sudoku. Difficulty is how many numbers you start with.

Instruction copy: "Fill the grid so every row, column and box holds each number once."

## Interaction

- Tap a cell to select it, then tap a number on the pad. Tapping the same number again clears the cell.
- Selecting a cell shades its row, column and box, and every cell with the same number.
- Givens are bold paper. Your numbers are regular weight in `--color-entry` (light blue), so the two never get confused.
- **Notes:** toggle "notes on" and the pad pencils small candidates into the cell. Placing a number clears it from the notes of every cell in the same row, column and box.
- A number that repeats in a row, column or box gets an ember underline right away. This is a rule check, not an answer check: a number can be wrong without clashing (use a hint to find out).
- A number pad button fades once all of that number are on the board.
- **Hint** (5 second cooldown): outlines the next cell to fill, softly marks the cells that justify it, and says why. If you placed a wrong number, it points that out first. Hints are counted on the result screen.
- Keyboard: arrows move, number keys place, N toggles notes, Backspace or 0 clears.

## Generation

1. Fill a random complete 6×6 grid with seeded backtracking.
2. Remove givens in random order and keep each removal only if the logic solver can still finish the board with singles. Easy, medium and hard remove in rotationally symmetric pairs (the classic look). Expert removes single cells, which is the only way to reach 9.
3. Stop as soon as the board has exactly the tier's number of givens. If an attempt gets stuck above it, try again with a new fork of the seed (up to 60 attempts, keeping the board with the fewest givens).

Logic solver (`solveLogic`, `nextStep`), simplest technique first:

| Level | Techniques |
|-------|-----------|
| 1 | naked single, hidden single |
| 2 | pointing, claiming, naked pair, hidden pair |
| 3 | naked triple, hidden triple, X-wing |

Boards are gated at level 1 on every tier. Levels 2 and 3 stay in the solver for hints and for a possible 9×9 mode later. The solver only places forced numbers, so any board it finishes has exactly one solution and never needs a guess. Tests double-check with a brute-force solution counter.

## Difficulty

| Tier | Grid | Givens | Par |
|------|------|--------|-----|
| Easy | 6×6 | 18 (half the grid) | 45s |
| Medium | 6×6 | 14 | 75s |
| Hard | 6×6 | 12 | 2 min |
| Expert | 6×6 | 9 | 3 min |

Fewer givens means more cells to work out and longer chains where one placed number unlocks the next. 9 is the floor: singles-only removal on 6×6 never got below it in 300 probe boards (pairs and pointing don't get lower either). Expert reaches 9 on about 1 attempt in 5, so 60 attempts make a miss practically impossible.

Tested: 100 seeds per tier, every board 6×6 with exactly the tier's givens, one solution, solvable with singles. Generation is under a millisecond per attempt.

## Hints

`sudokuHint` returns the next number to place and why:

- naked single: "Only 5 fits here: its row, column and box already have every other number."
- hidden single: "In box 4, 7 can only go here."
- when no single is visible, it applies the advanced steps that unlock one and explains the first: "In box 2, 3 can only be in row 1, so 3 can't go anywhere else in that row. That leaves 6 as the only option here." Current boards never need this, since they are all singles-only.

Tested: following hints alone solves every tested board on every tier, each hint gives the right number, and none falls back to just giving the answer.

## Scoring

Time to solve. Hints shown.

## Score lines

- High: "Six for six." / "Every number knew its place." / "Clean grid, no guesswork."
- Mid: "Solid logic." / "Filled in, fair and square." / "The numbers fell into line."
- Low: "Slow, steady, solved." / "Every box checked. Eventually." / "Patience is a technique too."
