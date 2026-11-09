# blocks

**Skill:** spatial partitioning · **Inspired by:** LinkedIn Patches · **Status:** live (v0.3)

## Rules

Split the grid into rectangles. Each rectangle contains exactly one clue. A clue tells you the rectangle's area and its shape: square, wide (wider than tall), tall (taller than wide), or any shape (dashed square glyph).

Instruction copy: "Draw a rectangle around every clue. Match its size and shape."

## Interaction

- Drag from any cell to any cell to draw a rectangle. Release to place it. Dragging past the board edge stretches the rectangle to the edge.
- While you drag, a label above the preview gives a live verdict (D-058): the area and a ✓ on a pill in the clue's colour when it fits the one number inside (the preview takes that colour too), otherwise a paper pill with the reason: `4 of 6` (wrong area), `needs ▭` (right area, wrong shape), `no number`, `2 numbers`.
- A drag never erases a rectangle that fits its clue (D-057). If the new rectangle would overlap one, the preview turns ember with `in the way`, the finished rectangle gets an ember outline, and on release nothing changes: the finished rectangle shakes and the line under the board says "Tap a finished rectangle to remove it."
- A drag does replace rectangles that don't fit a clue, since they can never be part of the answer. While you draw over one, it dims to show it will go.
- Tap a placed rectangle to remove it. A tap on an empty cell does nothing (no clue has area 1).
- Clue cells sit on a raised fill (`--color-slate` at 60%, like given cells in balance) with the number in paper. Colour only appears once a rectangle fits, so colour means done.
- A rectangle that fits exactly one clue becomes a solid piece: 2px border in the clue's colour and an opaque fill of that colour at 24% over graphite, so the cell grid inside it disappears and it reads as one block. Anything else gets a dashed fog border and a tab across its top edge with the same reason as the preview, so it never covers a number.
- Under the board: a one-line note (how to start on an empty board, or why a drag was refused) and `placed 5/9`, the rectangles that fit out of the total.
- Gesture rules live in `applyGesture`, `blockersOf` and `verdict` in the engine and are unit tested.
- On 7×7 and 8×8, two-digit clues stack the number over the glyph so they fit the cell.
- Keyboard: arrows move a cursor, Enter starts a rectangle and Enter again places it, Delete removes the one under the cursor, Escape cancels.

## Generation

1. Tile the grid with random rectangles: repeatedly take the top-left free cell and pick a rectangle that fits there within the tier's area range, weighted towards mid-sized pieces. Restart if a gap is too small to fill.
2. Place one clue at a random cell inside each rectangle, with its area and true shape.
3. Run the solver. If a second solution exists, re-roll the clue positions in the rectangles that solution changes. Retry up to 30 times, then start over with a fresh tiling.
4. Hide shape hints (set to "any") one at a time in random order while the board stays unique, up to the tier's share.
5. Colour the rectangles so no two touching rectangles share a colour, picking the least-used allowed colour each time so a board uses the whole palette.

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

The hues mark placed pieces only: borders at full strength, fills mixed to 24% into graphite with `color-mix`. Clue numbers stay paper whether placed or not.

## Scoring

Time to solve. Redraws counted and shown.

## Score lines

- High: "Everything in its place." / "Packed like a pro." / "Not a cell wasted."
- Mid: "Neatly packed." / "It all lines up." / "Tidy work."
- Low: "It all fits. Somehow." / "A few redraws, a full grid." / "Square pegs, square holes, eventually."
