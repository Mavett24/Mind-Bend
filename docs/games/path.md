# path

**Skill:** route planning · **Inspired by:** LinkedIn Zip · **Status:** planned

## Rules

Draw one continuous line through every cell of the grid. The line must pass through the numbered cells in order, starting at 1 and ending at the highest number. Walls between cells cannot be crossed.

Instruction copy: "Connect the numbers in order. Fill every cell."

## Interaction

- Press on cell 1 (or the current line end) and drag through neighbouring cells. Moving back over the previous cell undoes it.
- Tap any cell already on the line to cut the line back to that cell.
- Keyboard: arrows extend the line, Backspace undoes.
- The line is drawn in ember, 40% of cell width, rounded joins. Numbered cells are paper on graphite circles.

## Generation

1. Build a random Hamiltonian path on the N×N grid with the seeded RNG (random walk with Warnsdorff tie-breaking, then backbite moves to randomise).
2. Place checkpoints along the path: always at the start and end, then at random intervals.
3. Run the solver. If more than one solution exists, add a checkpoint or a wall at the first point where two solutions diverge. Repeat until unique.
4. For harder tiers, try removing checkpoints one at a time and keep each removal that leaves the solution unique.

Solver: depth-first search from 1, pruning when the next checkpoint becomes unreachable, when an unvisited region is cut off, or when a dead-end cell appears that is not the final checkpoint. Count solutions up to 2 and stop.

## Difficulty

| Tier | Grid | Checkpoints | Walls |
|------|------|-------------|-------|
| Easy | 5×5 | ~1 per 3 cells | none |
| Medium | 6×6 | ~1 per 5 cells | none |
| Hard | 7×7 | minimal unique set | 0 to 4 |
| Expert | 8×8 | minimal unique set | 2 to 8 |

## Scoring

Time to solve. Backtracks are counted and shown but do not change the score.

## Score lines (draft)

- Fast: "Clean lines. No hesitation." / "You saw the whole route before you started."
- Average: "Got there. Took the scenic route."
- Slow: "A path was found. Eventually."
