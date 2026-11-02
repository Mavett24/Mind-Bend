# trivia

**Skill:** knowledge and estimation · **Inspired by:** Lessgames · **Status:** live (v0.4)

Two modes under one game. Both are ten questions against the clock, scored out of 10 (D-027).

## Choosing a mode

After pressing play, the board offers higher or lower, or categories with a category chip (mixed, general, science, geography, history, film, music, sport, nature, arts & books). Daily and challenge boards use the same seed whichever mode is picked.

## Mode A: higher or lower

Two items share a measurable value. Pick the one with the higher value.

- Ten pairs, cycling through four sets: country population, country GDP, country area, city population.
- After a pick, both values appear in readable form ("36.2 million people", "$27.4 trillion"). The right card gets a paper border and ✓, a wrong pick gets an ember border, × and a shake.
- The source is shown under every pair.
- Difficulty comes from how close the two values are (table below).
- No name repeats within a game.

## Mode B: categories

Ten multiple-choice questions from one category, or mixed.

- Options are shuffled per question. Easy drops one wrong option, so three remain.
- Correct answers get a paper border and ✓. A wrong pick shakes, marks × and the right answer is shown.

## Scoring

Each answer is worth 0 if wrong or out of time, otherwise 0.7 plus up to 0.3 for speed. Ten instant correct answers make 10.00. The running total shows in the header, and each answer shows its points.

The header shows the seconds left on the question, counting down in tenths ("12.4 s"), with a time bar under it. Both read from the same clock and freeze where they were when you answer; the number turns fog once it stops. The running score sits on the left of the same row (D-051).

## Difficulty

| Tier | Seconds per question | Options | Higher or lower: ratio between values |
|------|----------------------|---------|---------------------------------------|
| Easy | 20 | 3 | 3× or more |
| Medium | 15 | 4 | 1.5× to 3× |
| Hard | 12 | 4 | 1.15× to 1.5× |
| Expert | 8 | 4 | 1.02× to 1.15× |

## Data

Built by `scripts/build-data.mjs`. Sources and licences are in `scripts/DATA_SOURCES.md`.

- Questions: OpenTriviaQA (CC BY-SA 4.0), filtered for length, four distinct options, nothing time-sensitive or politically contested, no image references, offensive words removed, deduplicated, up to 900 per category. One file per category so a game loads only what it needs (about 110 to 150 KB each).
- Higher or lower: World Bank population and GDP, mledoze/countries area, GeoNames city populations. Independent UN member states only. 169 to 344 items per set.
- Known limitation: OpenTriviaQA is uneven. Some questions have typos (often missing apostrophes) or are obscure. A hand-curation pass is on the roadmap (D-028).

## Score lines

- High (8+): "Calibrated." / "A walking almanac." / "Quick and right. Rare combination."
- Mid (5+): "Good instincts." / "More right than wrong, which is the point." / "Respectable range."
- Low: "Numbers are hard. Respectfully." / "Trivia is mostly trivia." / "Next round's on you."
