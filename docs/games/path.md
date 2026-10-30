# path

**Skill:** route planning · **Inspired by:** LinkedIn Zip · **Status:** live (v0.2)

## Rules

Draw one continuous line through every cell of the grid. The line must pass through the numbered cells in order, starting at 1 and ending at the highest number. Walls between cells cannot be crossed.

Instruction copy: "Connect the numbers in order. Fill every cell."

## Interaction

- Press on cell 1 (or the current line end) and drag through neighbouring cells. Moving back over the previous cell undoes it.
- Tap any cell already on the line to cut the line back to that cell.
- Keyboard: arrows extend the line, Backspace undoes.
- The line is drawn in ember, 36% of cell width, rounded joins. Covered cells fill with `--color-ember-wash`. Numbered cells are chalk circles that turn paper once reached. Walls are paper strokes on the cell edge.

## Generation

1. Build a random Hamiltonian path on the N×N grid: start from a serpentine and apply 30×N² random backbite moves with the seeded RNG.
2. Place checkpoints along the path: always at the start and end, then at a jittered spacing per tier. Hard and Expert also get a few random walls between cells that are not consecutive on the path.
3. Run the solver. If a second solution exists, find the first step where it leaves the true path. Rule it out either with a wall on that step (Hard and Expert, up to the wall limit) or with two checkpoints: the cell the true path visits and the cell the alternative visits instead. The true path reaches them in one order, the alternative in the other, so the alternative becomes impossible. Repeat until unique.
4. For Medium and up, try removing checkpoints one at a time and keep each removal that leaves the solution unique.

Solver (`solvePath`): depth-first search from 1 that counts solutions up to 2. Prunes when an unvisited cell is left with too few exits (checked only around the head, since nothing else changes) and when the unvisited cells stop being connected to the head. A node budget guards the search: if it runs out, the board is treated as not proven unique and tightened.

## Difficulty

| Tier | Grid | Checkpoints (avg) | Walls (avg) | Par |
|------|------|-------------------|-------------|-----|
| Easy | 5×5 | ~10 | none | 30s |
| Medium | 6×6 | ~9 | none | 60s |
| Hard | 7×7 | ~9 | ~3 | 2 min |
| Expert | 8×8 | ~11 | ~5 | 3 min |

Measured over 100 seeds per tier. Generation time (server CPU): Easy and Medium under 3ms median, Hard ~10ms, Expert ~55ms median and under 300ms worst case.

## Hints

The hint button highlights the next correct cell with a pulsing outline. If the line has gone off the solution, it is cut back to the last correct cell first. Hints have a 5 second cooldown and are counted on the result screen. Logic: `pathHint` in the engine, tested to walk from 1 to a full solve.

## Scoring

Time to solve. Hints are counted and shown but do not change the score.

## Score lines (draft)

- Fast: "Clean lines. No hesitation." / "You saw the whole route before you started."
- Average: "Got there. Took the scenic route."
- Slow: "A path was found. Eventually."
