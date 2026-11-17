# balance

**Skill:** binary deduction · **Inspired by:** LinkedIn Tango · **Status:** live (v0.2)

## Rules

Fill every cell with a dot (●) or a ring (○).

1. Each row and each column has the same number of dots and rings.
2. No more than two of the same symbol next to each other, horizontally or vertically.
3. Cells joined by `=` hold the same symbol. Cells joined by `×` hold different symbols.

Instruction copy: "Equal dots and rings per line, never three in a row. = joins matches, × joins opposites."

Symbols are our own (dot and ring), not suns and moons.

## Palette

| Symbol | Shape | Colour | Token | Contrast on graphite |
|--------|-------|--------|-------|----------------------|
| dot | filled circle | amber `#ffcf4a` | `--color-balance-dot` | 12:1 |
| ring | 3px outline circle | blue `#4f9dff` | `--color-balance-ring` | 6.4:1 |

Checked with a colour vision simulation (Machado 2009, full severity): the two stay about 60 ΔE2000 apart for deuteranopia and protanopia, 44 for tritanopia and 15 in greyscale, on top of the shape difference. Givens use the same colours on the lighter given cell. The ember rule-break underline and broken-link badge are shapes of their own, so amber never has to be told apart from ember by colour alone (D-055).

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
| Expert | 6×6 | ~6.5 | 4.0 | always needs one step of lookahead | 4 min |

Every tier is 6×6 (D-063). Expert boards are regenerated (up to 24 tries, deterministic per seed) until rules alone can't finish them; in practice all of them need the lookahead step. Generation: under 1ms median, ~2ms for Expert.

## Hints

The hint button explains the next move. It outlines the cell, softly marks the cells that justify it, and says why in one sentence. It doesn't fill the cell: the point is to learn the rule. Hints have a 5 second cooldown and are counted on the result screen.

Order of hints (`balanceHint`):
1. A wrong cell, if the player placed one: "This can't be a dot: the board can't be finished with it."
2. A link: "= means these two cells match, so this one is a ring."
3. A pair: "Two dots side by side, so the next cell must be a ring."
4. A gap: "A ring on both sides, so the middle must be a dot."
5. A full line: "Row 3 already has 3 dots, so the rest are rings."
6. One step of "what if": "Try a dot here and follow the rules: a row or column breaks. So it has to be a ring."

Tested: starting from the givens, following hints alone solves 160 boards across all tiers, every hint gives the right symbol, and none falls back to "only this works".

## Scoring

Time to solve. Mistakes shown, not penalised.

## Score lines (draft)

- Fast: "Perfectly balanced." / "Equilibrium, achieved."
- Average: "Stable enough."
- Slow: "It tipped a few times, but it holds."
