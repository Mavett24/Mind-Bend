# sudoku

**Skill:** number logic · **Inspired by:** LinkedIn Mini Sudoku and classic sudoku · **Status:** live (v0.6)

## Rules

Fill every empty cell so each row, each column and each box holds every number exactly once. Easy is a 6×6 grid with 2×3 boxes and the numbers 1 to 6. The other tiers are classic 9×9.

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

1. Fill a random complete grid with seeded backtracking.
2. Remove givens in random order and keep each removal only if the logic solver can still finish the board with the tier's techniques. Easy, medium and hard remove in rotationally symmetric pairs (the classic look). Expert removes single cells, which reaches fewer givens.
3. Stop at the tier's minimum number of givens.
4. Grade: count how many advanced steps (anything beyond singles) the solver needed. If the board needs fewer than the tier's floor, try again with a new fork of the seed (up to 60 attempts, keeping the hardest board seen).

Logic solver (`solveLogic`, `nextStep`), simplest technique first:

| Level | Techniques |
|-------|-----------|
| 1 | naked single, hidden single |
| 2 | pointing, claiming, naked pair, hidden pair |
| 3 | naked triple, hidden triple, X-wing |

The solver only places forced numbers, so any board it finishes has exactly one solution. Tests double-check with a brute-force solution counter.

## Difficulty

| Tier | Grid | Givens (avg) | Techniques allowed | Must need | Par |
|------|------|--------------|--------------------|-----------|-----|
| Easy | 6×6 | 12 | singles | nothing more | 90s |
| Medium | 9×9 | 30 | singles | nothing more | 5 min |
| Hard | 9×9 | 27.5 | up to pairs and pointing | at least 1 advanced step (avg 2.8) | 10 min |
| Expert | 9×9 | 24.6 | up to triples and X-wing | at least 3 advanced steps (avg 5.7) | 15 min |

Measured over 40 seeds per tier. None of the 160 boards had more than one solution, and no hard or expert board could be finished with singles alone.

Generation: under 5ms for easy and medium, ~35ms median for hard, ~120ms median and under 600ms worst case for expert (server CPU). Boards are built while the "building board" state shows.

## Hints

`sudokuHint` returns the next number to place and why:

- naked single: "Only 5 fits here: its row, column and box already have every other number."
- hidden single: "In box 4, 7 can only go here."
- when no single is visible, it applies the advanced steps that unlock one and explains the first: "In box 2, 3 can only be in row 1, so 3 can't go anywhere else in that row. That leaves 6 as the only option here."

Tested: following hints alone solves every tested board on every tier, each hint gives the right number, and none falls back to just giving the answer.

## Scoring

Time to solve. Hints shown.

## Score lines

- High: "Nine for nine." / "Every number knew its place." / "Clean grid, no guesswork."
- Mid: "Solid logic." / "Filled in, fair and square." / "The numbers fell into line."
- Low: "Slow, steady, solved." / "Every box checked. Eventually." / "Patience is a technique too."
