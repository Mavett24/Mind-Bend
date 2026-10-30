# blocks

**Skill:** spatial partitioning · **Inspired by:** LinkedIn Patches · **Status:** planned

## Rules

Split the grid into rectangles. Each rectangle contains exactly one clue. A clue tells you the rectangle's area, and may also tell you its shape: square, wide (wider than tall), tall (taller than wide), or any.

Instruction copy: "Draw a rectangle around every clue. Match its size and shape."

## Interaction

- Drag from any cell to any cell to draw a rectangle. Release to place it.
- A placed rectangle fills with its clue's board colour at 20% opacity, with a 1px border at full colour.
- Tap a rectangle to remove it.
- A rectangle that overlaps another, contains two clues, or breaks its clue is drawn with a dashed border.
- Keyboard: arrows move a cursor, Shift+arrows extend a selection, Enter places.

## Generation

1. Partition the grid into random rectangles with the seeded RNG (recursive splitting with a target size range per tier, rejecting 1×1 pieces above Easy).
2. Place one clue cell at a random position inside each rectangle, with its area and true shape.
3. Run the solver. If not unique, re-roll clue positions inside the ambiguous rectangles, then try again.
4. For harder tiers, hide shape hints (set to "any") one at a time while the board stays unique.

Solver: for each clue, enumerate every rectangle of the right area and shape that contains it and no other clue. Then exact-cover search (Algorithm X) over those candidates, counting solutions up to 2.

## Difficulty

| Tier | Grid | Rectangles | Shape hints |
|------|------|------------|-------------|
| Easy | 5×5 | 5 to 7 | all shown |
| Medium | 6×6 | 7 to 9 | mostly shown |
| Hard | 7×7 | 9 to 12 | about half |
| Expert | 8×8 | 12 to 16 | few |

## Board palette

Eight hues tuned for contrast on graphite and colour-blind safety, each paired with its clue's shape glyph so colour is never the only signal. Defined in `src/games/blocks/palette.ts`.

## Scoring

Time to solve. Redraws counted and shown.

## Score lines (draft)

- Fast: "Everything in its place." / "Tetris would be proud."
- Average: "Neatly packed."
- Slow: "It all fits. Somehow."
