# balance

**Skill:** binary deduction · **Inspired by:** LinkedIn Tango · **Status:** planned

## Rules

Fill every cell with a dot (●) or a ring (○).

1. Each row and each column has the same number of dots and rings.
2. No more than two of the same symbol next to each other, horizontally or vertically.
3. Cells joined by `=` hold the same symbol. Cells joined by `×` hold different symbols.

Instruction copy: "Equal dots and rings in every line. Never three in a row."

Symbols are our own (dot and ring), not suns and moons.

## Interaction

- Tap cycles a cell: empty → dot → ring → empty.
- Given cells are locked and drawn in paper. Player cells are drawn in fog.
- Rule breaks are shown as an ember underline on the offending row or column after a 600ms pause, so the board does not nag mid-thought.
- Keyboard: arrows move, `1` dot, `2` ring, Backspace clears.

## Generation

1. Generate a random valid full grid with backtracking (row by row, checking balance and the no-three rule).
2. Add `=` and `×` constraints between a random subset of adjacent pairs, derived from the solution.
3. Remove givens one at a time in random order. Keep each removal if the solver still finds exactly one solution.
4. Stop when the tier's target given count is reached, or when no further removal keeps the board unique.

Solver: constraint propagation (balance, no-three, `=`/`×`) plus backtracking. Also records the deepest technique needed, which the generator uses to grade difficulty.

## Difficulty

| Tier | Grid | Givens | Constraints | Required reasoning |
|------|------|--------|-------------|--------------------|
| Easy | 6×6 | 12 to 14 | 4 | single-step rules only |
| Medium | 6×6 | 8 to 10 | 6 | balance counting |
| Hard | 6×6 | minimal | 6 to 8 | chains of `=`/`×` |
| Expert | 8×8 | minimal | 8 to 12 | lookahead required |

## Scoring

Time to solve. Mistakes shown, not penalised.

## Score lines (draft)

- Fast: "Perfectly balanced." / "Equilibrium, achieved."
- Average: "Stable enough."
- Slow: "It tipped a few times, but it holds."
