# recall

**Skill:** visual working memory · **Inspired by:** Dialed's color game · **Status:** planned

## The twist

Dialed asks you to remember one colour at a time. Recall asks you to hold several colours at once, each tied to a position, then recreate the one it asks for. That moves the game from pure perceptual memory into visual working memory, which has a famous capacity limit of roughly four items (Luck & Vogel, 1997). The tiers are built around that limit, so Expert should feel genuinely hard for everyone.

## Rules

1. The card shows a set of coloured tiles in fixed positions for a short time.
2. The tiles disappear. One position is highlighted.
3. Recreate the colour that was in that position.
4. Five rounds per game. Score is the average accuracy.

Instruction copy: "Remember the colours and where they were. Then rebuild one."

## Interaction

- During display, the whole card is the stimulus. No chrome, only the countdown in the corner (`3.28`, fraction dimmed).
- Picker: a hue strip and a lightness/chroma plane, press-and-hold to drag. The preview fills the highlighted tile in real time.
- Commit with the primary action.
- Result: the card splits horizontally, your colour on top, the target below, each labelled with its value. Score counts up, then the score line lands.

## Colour space and scoring

- Targets are sampled in OKLCH within a safe gamut (L 0.35 to 0.85, C 0.05 to 0.2), so no colour is unreachable on an sRGB screen.
- Accuracy uses CIEDE2000 colour difference (ΔE00), mapped to a 0 to 10 score: ΔE 0 = 10.00, ΔE 40 or more = 0.00, on a curve that rewards near-misses.
- In multi-tile rounds, target colours are spaced at least ΔE 20 apart so they are distinguishable.

## Difficulty

| Tier | Tiles shown | Display time | Recalled |
|------|-------------|--------------|----------|
| Easy | 1 | 5s | 1 |
| Medium | 2 | 4s | 1 |
| Hard | 3 | 3s | 1 |
| Expert | 4 | 3s | 2 (one after the other) |

## Score lines (draft, per round score)

- 9.5 and up: "Photographic. Suspiciously so."
- 8 to 9.5: "Sharp eye."
- 6 to 8: "Close enough to argue about."
- 4 to 6: "Same family. Different cousin."
- Under 4: "That was a colour. Not the colour."
