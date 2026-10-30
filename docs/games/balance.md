# balance

**Skill:** binary deduction · **Inspired by:** LinkedIn Tango · **Status:** live (v0.2)

## Rules

Fill every cell with a dot (●) or a ring (○).

1. Each row and each column has the same number of dots and rings.
2. No more than two of the same symbol next to each other, horizontally or vertically.
3. Cells joined by `=` hold the same symbol. Cells joined by `×` hold different symbols.

Instruction copy: "Equal dots and rings per line, never three in a row. = joins matches, × joins opposites."

Symbols are our own (dot and ring), not suns and moons.

## Interaction

- Tap cycles a cell: empty → dot → ring → empty.
- Given cells are locked and sit on a lighter cell (`--color-slate` at 60%). Player cells sit on graphite.
- Rule breaks are shown as an ember underline on the offending row or column after a 600ms pause, so the board does not nag mid-thought.
- Keyboard: arrows move, `1` dot, `2` ring, Backspace clears.

## Generation

1. Generate a random valid full grid with backtracking (cell by cell, checking balance and the no-three rule).
2. Add `=` and `×` links between a random subset of adjacent pairs, read off the solution.
3. Remove givens one at a time in random order. Keep each removal only if the deduction solver can still finish the board.
4. Stop when the tier's target given count is reached, or when no further removal keeps the board solvable.

Deduction solver (`solveByDeduction`): level 1 applies the rules until nothing changes (count rule, pair and gap triple rules, links). Level 2 adds one step of lookahead: try a symbol, propagate, and if that contradicts, the other symbol is forced. No guessing beyond that.

Because every step is a forced deduction from the rules, a board the solver finishes can only have one solution. Tests double-check this with a brute-force counter on 100 seeds per tier.

## Difficulty

| Tier | Grid | Givens (avg) | Links (avg) | Reasoning | Par |
|------|------|--------------|-------------|-----------|-----|
| Easy | 6×6 | 13 | 3.4 | rules only | 45s |
| Medium | 6×6 | 9 | 5.5 | rules only | 90s |
| Hard | 6×6 | ~6 | 6.9 | rules only, long chains | 2.5 min |
| Expert | 8×8 | ~10 | 9.9 | one step of lookahead | 5 min |

Generation: under 1ms median for 6×6, ~6ms median for Expert.

## Scoring

Time to solve. Mistakes shown, not penalised.

## Score lines (draft)

- Fast: "Perfectly balanced." / "Equilibrium, achieved."
- Average: "Stable enough."
- Slow: "It tipped a few times, but it holds."
