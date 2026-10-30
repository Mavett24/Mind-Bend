# weave

**Skill:** word finding · **Inspired by:** LinkedIn Wend · **Status:** planned

## Rules

The grid is made entirely of hidden words. Trace a word by connecting neighbouring letters (up, down, left, right, and diagonally). Every letter belongs to exactly one word. Clear the whole grid.

Instruction copy: "Every letter belongs to one word. Use them all."

## Interaction

- Drag through letters to spell a word. Release to submit.
- A valid word locks in: its letters fill with a board colour and the path is drawn through them.
- An invalid word shakes and clears.
- A valid dictionary word that cannot be part of a full solution is accepted but flagged with `!`, so the player learns to plan ahead. They can tap it to release the letters.
- Hint: reveals the first letter of one target word. Hints are counted.

## Generation

1. Pick target words from the curated dictionary with the seeded RNG, matching the tier's length range, until their letter count fills the grid.
2. Lay the words into the grid as non-crossing paths of adjacent cells (randomised backtracking: grow each word path cell by cell from a free cell, retry on dead ends).
3. Reject the board if a common offensive or obscure word is accidentally spelled along any path (checked against a blocklist).

## Solution check

Solved means every letter is covered by valid dictionary words, not necessarily the generator's words. Any full cover is a win.
**Why:** guaranteeing a single solution for word grids is expensive and would reject most boards. Accepting any valid full cover is fairer to the player.

## Dictionary

A curated list of common English words, 4 to 8 letters, from a permissively licensed word list, filtered for familiarity and offensive terms. Bundled as a static file, loaded only when the game opens. Source and licence recorded in `src/games/weave/dictionary/README.md`.

## Difficulty

| Tier | Grid | Word length | Words |
|------|------|-------------|-------|
| Easy | 4×4 | 4 | 4 |
| Medium | 5×5 | 4 to 6 | 4 to 6 |
| Hard | 6×6 | 5 to 7 | 5 to 7 |
| Expert | 6×6 | 5 to 8 | 4 to 6, less common words |

## Scoring

Time to clear. Hints and released words shown.

## Score lines (draft)

- Fast: "Fluent." / "You read the grid like a sentence."
- Average: "Untangled."
- Slow: "Knots undone, one by one."
