# weave

**Skill:** word finding · **Inspired by:** LinkedIn Wend · **Status:** live (v0.5)

## Rules

The grid hides a few words, plus some empty grey tiles. Trace a word by joining letters that touch up, down, left or right. No diagonals. Every letter belongs to exactly one hidden word. The boxes under the grid show how long each word is, shortest first.

Instruction copy: "Trace words through letters that touch up, down, left or right. Every letter belongs to one hidden word."

## Interaction

- Press on a letter and drag through its neighbours. Dragging back over the previous letter removes it. Empty tiles and found words can't be traced through.
- The word being traced shows above the grid.
- Release to submit:
  - a hidden word locks in: its letters and its length slot fill with the word's colour, and its path is drawn through the letters
  - a real word that isn't hidden here: "a word, but not hidden here" (no penalty)
  - anything else: "not a word", with a shake
- Hint: reveals the next letter of the shortest unfound word, in its slot and as a coloured ring in the grid. 5 second cooldown, counted on the result screen.
- Keyboard: arrows move a cursor, Space adds the letter under it, Enter submits, Backspace removes the last letter, Escape clears.

## Generation

1. Pick a word-length set for the tier. Cells left over become empty tiles.
2. Scatter the empty tiles randomly, never two side by side.
3. Cover every other cell exactly with up/down/left/right paths of the planned lengths, longest first. Each path starts on the free cell with the fewest free neighbours and grows towards tight spots, and every leftover region must stay big enough for the shortest remaining word. Retry with a new fork of the seed if it fails.
4. Assign a different word of the right length to each path.

## Solution check

A hidden word is found when the trace spells it over exactly its cells (D-026).

## Words

Built by `scripts/build-data.mjs` from SCOWL frequency lists (see `scripts/DATA_SOURCES.md`). Hidden words skip plurals and inflections whose stem is also a word. Offensive words are removed.

## Difficulty

| Tier | Grid | Word lengths | Empty tiles | Word pool | Par |
|------|------|--------------|-------------|-----------|-----|
| Easy | 4×4 | 3 words, 3 to 5 letters | 3 to 4 | most common (SCOWL 10) | 45s |
| Medium | 5×5 | 4 words, 4 to 6 letters | 4 to 5 | common (SCOWL 10 + 20) | 90s |
| Hard | 6×6 | 5 words, 4 to 8 letters | 6 | common (SCOWL 10 + 20) | 2.5 min |
| Expert | 6×6 | 5 words, 5 to 8 letters | 2 | less common (SCOWL 35) | 4 min |

Generation: under 4ms median, under 12ms worst case over 100 seeds per tier.

## Scoring

Time to clear. Hints shown.

## Score lines

- High: "Fluent." / "You read the grid like a sentence." / "Untangled in record time."
- Mid: "Untangled." / "Every letter found its word." / "Woven back together."
- Low: "Knots undone, one by one." / "The words were in there somewhere. You found them." / "Slow and thorough. Still counts."
