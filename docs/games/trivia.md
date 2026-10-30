# trivia

**Skill:** knowledge and estimation · **Inspired by:** Lessgames · **Status:** planned

Two modes under one game.

## Mode A: higher or lower

Two items share a measurable attribute (population, height, release year, length, calories). Pick the one with the higher value. Keep going until you miss. Score is the streak.

- After each pick, both values count up into view, then the right card slides left and a new card enters.
- Difficulty comes from the gap between values: Easy pairs differ by 3× or more, Expert pairs within 15%.
- Daily: a fixed seeded sequence of 20 pairs, same for everyone.

**Data:** built from public datasets with open licences (country data from the World Bank, CC BY 4.0; landmarks, films and other items from Wikidata, CC0). Compiled at build time into static JSON with source and date per value. Every value shows its unit and source on reveal.

## Mode B: categories

Multiple choice, four options, ten questions per game, 15 seconds each.

- Pick a category (general knowledge, science, geography, history, film, music, sport, art) or "mixed".
- Correct answers fill the option with a paper outline and `✓`. Wrong ones shake, mark `×` and reveal the right answer.
- Score: correct answers plus a small speed bonus.

**Data:** a local question bank seeded from Open Trivia DB (CC BY-SA 4.0, attributed in the footer and an about page), deduplicated, checked, and stored as static JSON. Questions keep their source difficulty, which maps to our tiers. Anything ambiguous or outdated is removed during import.

## Difficulty

| Tier | Higher or lower gap | Categories questions |
|------|---------------------|----------------------|
| Easy | 3× or more | easy |
| Medium | 1.5× to 3× | easy and medium |
| Hard | 1.15× to 1.5× | medium and hard |
| Expert | under 1.15× | hard, 10s timer |

## No repeats

Practice tracks seen question and pair ids in localStorage and avoids them until the pool for that tier runs low.

## Score lines (draft)

- Higher or lower, streak 15+: "Calibrated."
- Streak 5 to 15: "Good instincts."
- Under 5: "Numbers are hard. Respectfully."
- Categories, 10/10: "Flawless!" (the only exclamation mark in the app)
