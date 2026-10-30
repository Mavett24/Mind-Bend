# weave

**Skill:** word finding · **Inspired by:** LinkedIn Wend · **Status:** live (v0.4)

## Rules

The grid is made entirely of hidden words. Trace a word by connecting touching letters: up, down, sideways and diagonally. Every letter belongs to exactly one hidden word. Find them all.

Instruction copy: "Trace words through touching letters, diagonals too. Every letter belongs to one hidden word."

## Interaction

- Press on a letter and drag through neighbours. Dragging back over the previous letter removes it. A letter only registers when your finger is near its centre (42% of a cell), so diagonal moves don't clip the corner letters.
- The word you're tracing shows above the grid, letter by letter.
- Release to submit:
  - a hidden word locks in: its letters fill with a board colour and its path is drawn as a line through them
  - a real word that isn't hidden here: "a word, but not hidden here" (no penalty)
  - anything else: "not a word", with a shake
- Hint: reveals the next letter of the first unfound word, outlined in that word's colour. Hints are counted on the result screen.
- Keyboard: arrows move a cursor, Space adds the letter under it, Enter submits, Backspace removes the last letter, Escape clears.

## Generation

1. Plan word lengths that sum exactly to the grid size, only picking lengths that leave a fillable remainder (`lengthPlan`).
2. Carve the grid into paths with those lengths. Each path starts at the free cell with the fewest free neighbours and prefers tight corners, so no unreachable gaps are left. Diagonal steps are recorded as they happen and a path can never cross another diagonal, including its own.
3. After each path, every leftover region must still be big enough for a word. Otherwise the attempt restarts with a fresh fork of the seed.
4. Assign a different hidden word of the right length to each path.

## Solution check

A hidden word is found when the trace spells it over exactly its cells. The game is about finding the grid's words, Strands-style, rather than any valid cover (D-026). Real words that aren't hidden are acknowledged, not punished.

## Words

Built by `scripts/build-data.mjs` from SCOWL frequency lists (see `scripts/DATA_SOURCES.md`). Hidden words skip plurals and inflections whose stem is also a word ("huskiest", "twigged" are out). Offensive words are removed. The dictionary of findable words has about 33,000 entries of 3 to 8 letters.

## Difficulty

| Tier | Grid | Word length | Hidden words (avg) | Word pool | Par |
|------|------|-------------|--------------------|-----------|-----|
| Easy | 4×4 | 4 | 4 | most common (SCOWL 10) | 45s |
| Medium | 5×5 | 4 to 6 | 5.1 | common (SCOWL 10 + 20) | 90s |
| Hard | 6×6 | 5 to 7 | 6 | common (SCOWL 10 + 20) | 2.5 min |
| Expert | 6×6 | 5 to 8 | 5.8 | less common (SCOWL 35) | 4 min |

Generation: ~3ms median, under 20ms worst case, measured over 100 seeds per tier.

## Scoring

Time to clear. Hints shown.

## Score lines

- High: "Fluent." / "You read the grid like a sentence." / "Untangled in record time."
- Mid: "Untangled." / "Every letter found its word." / "Woven back together."
- Low: "Knots undone, one by one." / "The words were in there somewhere. You found them." / "Slow and thorough. Still counts."
