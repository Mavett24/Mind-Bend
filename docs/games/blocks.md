# blocks

**Skill:** spatial partitioning · **Inspired by:** LinkedIn Patches · **Status:** live (v0.3)

## Rules

Split the grid into rectangles. Each rectangle contains exactly one clue. A clue tells you the rectangle's area, and may also tell you its shape: square, wide (wider than tall), tall (taller than wide). A clue with no shape glyph can be any shape.

Instruction copy: "Draw a rectangle around every clue. Match its size and shape."

## Interaction

- Drag from any cell to any cell to draw a rectangle. A dashed preview shows its area while you drag. Release to place it.
- Drawing over placed rectangles replaces them.
- Tap a placed rectangle to remove it.
- A rectangle that matches exactly one clue fills with that clue's colour (22% fill, 2px border). Anything else gets a dashed fog border.
- Keyboard: arrows move a cursor, Enter starts a rectangle and Enter again places it, Delete removes the one under the cursor, Escape cancels.

## Generation

1. Tile the grid with random rectangles: repeatedly take the top-left free cell and pick a rectangle that fits there within the tier's area range, weighted towards mid-sized pieces. Restart if a gap is too small to fill.
2. Place one clue at a random cell inside each rectangle, with its area and true shape.
3. Run the solver. If a second solution exists, re-roll the clue positions in the rectangles that solution changes. Retry up to 30 times, then start over with a fresh tiling.
4. Hide shape hints (set to "any") one at a time in random order while the board stays unique, up to the tier's share.
5. Colour the rectangles greedily so no two touching rectangles share a colour.

Solver (`solveBlocks`): for each clue, list every rectangle of the right area and shape that contains it and no other clue. Then exact cover: always branch on the uncovered cell with the fewest options (Algorithm X's heuristic). Counts solutions up to 2.

The player wins with any valid tiling. Since the board is unique, that is always the generator's solution.

## Difficulty

| Tier | Grid | Area range | Rectangles (avg) | Shapes hidden | Par |
|------|------|------------|------------------|---------------|-----|
| Easy | 5×5 | 2 to 6 | 7.4 | none | 30s |
| Medium | 6×6 | 2 to 8 | 9.1 | 26% | 60s |
| Hard | 7×7 | 2 to 9 | 11.5 | 52% | 2 min |
| Expert | 8×8 | 3 to 12 | 11.2 | 80% | 3.5 min |

Measured over 100 seeds per tier. Generation is under 1ms median and under 7ms worst case on every tier.

## Board palette

Eight hues based on the Okabe-Ito colour-blind-safe set, lifted for a dark board. Every hue clears 5.9:1 against `--color-graphite`. Each clue also carries its shape glyph, so colour is never the only signal. Defined in `src/games/blocks/palette.ts`.

## Scoring

Time to solve. Redraws counted and shown.

## Score lines

- High: "Everything in its place." / "Packed like a pro." / "Not a cell wasted."
- Mid: "Neatly packed." / "It all lines up." / "Tidy work."
- Low: "It all fits. Somehow." / "A few redraws, a full grid." / "Square pegs, square holes, eventually."
