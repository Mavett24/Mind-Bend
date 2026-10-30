# recall

**Skill:** visual working memory · **Inspired by:** Dialed's color game · **Status:** live (v0.5)

## The twist

Dialed asks you to remember one colour at a time. Recall asks you to hold several colours at once, each tied to a position, then recreate the one it asks for. That moves the game from pure perceptual memory into visual working memory, which has a famous capacity limit of roughly four items (Luck & Vogel, 1997). The tiers are built around that limit, so Expert should feel genuinely hard for everyone.

## Rules

1. The card shows a set of coloured tiles in fixed positions for a short time.
2. The tiles disappear. One position is highlighted.
3. Recreate the colour that was in that position.
4. Five rounds per game. Score is the average accuracy.

Instruction copy: "Remember the colours and where they were. Then rebuild one." During display the board says "Remember this colour." or "Remember both colours and where they are." for the round.

## Interaction

Each round has four steps:

1. **Ready.** The stage shows dashed outlines where the tiles will be, and a card says what's coming: "3 colours, shown for 3 seconds". Below: "Remember all 3 colours and where each one is. You'll rebuild one." The player starts the round with "show the colours", so nothing flashes by unexpectedly.
2. **Show.** Tiles fill with colour (rounded, gapped). A countdown sits in a dark pill in the corner so it reads on any colour.
3. **Rebuild.** Other tiles go back to dashed outlines. The target tile has a white ring and a "rebuild this one" pill, and fills live with the player's colour. Three sliders: hue, vividness, brightness (plain names for OKLCH hue, chroma, lightness). Each track is a live gradient of what that slider would do. Then "lock in".
4. **Reveal.** The target splits, yours on top and the original below, with labels in pills. Other tiles come back at half strength. The score shows as "8.25 /10" next to the colour difference and "(0 is perfect)", then the round line.

Progress dots at the top show the five rounds. Expert rebuilds two tiles per round, labelled "colour 1 of 2". The game clock is hidden: recall is scored, not timed.

## Colour space and scoring

- Targets are sampled in OKLCH (L 0.45 to 0.85, C 0.05 to 0.2, any hue) and rejected unless they sit inside sRGB, so every target is reachable on a normal screen. The picker reaches further (L 0.25 to 0.95, C 0 to 0.25); out-of-gamut picks are mapped back by reducing chroma, the same way CSS does.
- Accuracy uses CIEDE2000 colour difference (ΔE00), computed in CIELAB from the colours actually displayed. The implementation is tested against the Sharma, Wu and Dalal (2005) reference pairs.
- Score: `10 × (1 − ΔE/40)^1.2`, 0 at ΔE 40 or more. ΔE 5 still scores about 8.5, so near-misses feel rewarded.
- Rating: 4/10 or below counts as a loss, 9/10 or above as a full win, linear between (D-022).
- In multi-tile rounds, target colours are spaced at least ΔE 20 apart so they are distinguishable.

## Difficulty

| Tier | Tiles shown | Display time | Recalled |
|------|-------------|--------------|----------|
| Easy | 1 | 5s | 1 |
| Medium | 2 | 4s | 1 |
| Hard | 3 | 3s | 1 |
| Expert | 4 | 3s | 2 (one after the other) |

## Round lines (per round score)

- 9.5 and up: "Photographic. Suspiciously so."
- 8 to 9.5: "Sharp eye."
- 6 to 8: "Close enough to argue about."
- 4 to 6: "Same family. Different cousin."
- Under 4: "That was a colour. Not the colour."

## Final score lines

- High (8+): "Your eyes keep receipts." / "A memory with a colour profile." / "Calibrated."
- Mid (5+): "Close enough to argue about." / "The gist survived. The details wandered." / "Respectable, for a human."
- Low: "Colours are slippery. Yours slipped." / "Memory: lossy compression." / "Same rainbow, different stripe."
