# Mind Bend: Design System

> A terminal at midnight that plays like a toy. Black page, raised cards that catch the light, mono headlines, a bright colour per game, and motion with weight.

This is the single source of truth for every visual and motion decision. The base comes from the Axiom style reference (`docs/reference/axiom-style-reference.md`). The motion language is studied from Dialed. Where the two disagree, or where a game needs something the reference never covered, the call is made here and logged in `docs/DECISIONS.md`.

## 1. Principles

1. **The card is the stage.** Every game lives inside one card with fixed proportions. The page around it stays quiet.
2. **Cards float, the page stays black.** Cards are raised surfaces (a soft top-to-bottom gradient, a 1px light ring and three layered drop shadows), Dialed style. Inside a card, wells and boards step back down with flat neutrals. (D-037, replaces "flat, layered darkness")
3. **Two voices, one family.** Geist Mono speaks (headings, labels, numbers, buttons). Geist Sans explains (everything you read). Nothing else.
4. **Ember is the brand mark.** Orange is the wordmark cursor, the streak, the pickers and activity. Primary buttons are white pills (D-038).
5. **Each game owns one hue.** A game's colour appears on its icon tile, its card art, its rating bar and its chart line, always next to the game's name or icon, never alone. Everything else in chrome stays monochrome.
6. **Motion has mass.** Things overshoot slightly and settle, like they were thrown. Nothing slides linearly.
7. **Numbers are the hero.** Timers and scores are set huge. They are the most important content on the screen.

## 2. Color

### Neutrals (chrome)

| Token | Value | Role |
|-------|-------|------|
| `--color-void` | `#000000` | Page background, card play surface |
| `--color-carbon` | `#111111` | Primary surface, game card base |
| `--color-graphite` | `#191919` | Elevated surfaces, tiles, board cells |
| `--color-iron` | `#202020` | Hairline borders, grid lines |
| `--color-slate` | `#3a3a3a` | Muted borders, inactive strokes |
| `--color-pewter` | `#505050` | Decorative rules |
| `--color-steel` | `#606060` | Tertiary text, inactive labels |
| `--color-ash` | `#7e7e7e` | Helper text, dimmed digits |
| `--color-fog` | `#b4b4b4` | Secondary text |
| `--color-chalk` | `#d9d9d9` | Light strokes |
| `--color-paper` | `#eeeeee` | Primary text |

### Accent

| Token | Value | Role |
|-------|-------|------|
| `--color-ember` | `#da5c2c` | Primary action fill, progress, active state, the daily card tick |
| `--color-ember-hover` | `#e46a3a` | Primary action hover |
| `--color-entry` | `#9ec1ff` | Numbers the player enters on a board (sudoku), so they read apart from bold paper givens. 9.6:1 on graphite |
| `--color-ember-wash` | `#2a1810` | Ember at about 15% over void. Fill for board cells covered by the player (path) |

Ember rules: primary buttons, progress bars, the active tier in the difficulty picker, the path line in Path, the small tick beside the daily card label, the wordmark cursor. Never on body text, never as a large background outside a board.

### Game hues

| Token | Value | Game |
|-------|-------|------|
| `--color-hue-path` | `#ff7a2f` | path |
| `--color-hue-balance` | `#22c7b8` | balance |
| `--color-hue-blocks` | `#ff5ca8` | blocks |
| `--color-hue-sudoku` | `#8585ff` | sudoku |
| `--color-hue-weave` | `#4ade80` | weave |
| `--color-hue-recall` | `#ffcc33` | recall |
| `--color-hue-trivia` | `#38bdf8` | trivia |

Black glyphs and text on every hue pass 4.5:1. All pass 3:1 against the card surface. They are identity colours, not a chart palette: two hues (pink and teal) sit close for deuteranopes, so a hue is always paired with the game's name or icon and charts show one game at a time.

### Surfaces

| Token | Value | Use |
|-------|-------|-----|
| `--color-surface-top` / `--color-surface-bottom` | `#0e0e0e` → `#262623` | The `.surface` gradient on every card |
| `--shadow-card` | 1px white ring at 7% + drops at 1/3, 7/14, 18/36px | Resting card |
| `--shadow-card-hover` | brighter ring, deeper drops | Hovered game card, which also lifts 2px |
| `--shadow-tile` | inset top highlight + small drop | Game icon tiles |
| `.well` | white at 3% with a 6% inset ring | Stat blocks and panels inside a card |

### Board palette (games only)

Inside a game board, color is information: regions in Blocks, symbols in Balance, the stimulus in Recall. These palettes live in each game's spec and must:

- pass 3:1 contrast against `--color-graphite` for any filled cell
- stay distinguishable for deuteranopia and protanopia (pair hue with a symbol or pattern where meaning depends on it)
- never leak outside the board onto chrome

Recall is the one game where the whole card becomes the stimulus color. That is the game, so it is allowed.

### In-game clock

The running clock in a game uses `--text-heading-lg` (24px), not a number size. During play the board is the focus; the big number belongs to the result screen.

### State without color

Correct, wrong and hint states use symbols and borders, not green or red fills: `✓`, `×`, `!`, a 1px `--color-paper` outline, a shake. The only exception is a wrong cell inside a board, which may flash ember briefly.

## 3. Typography

**Geist Mono** (`--font-mono`): headings, captions and tags, numbers, buttons, the wordmark, game names.
**Geist Sans** (`--font-sans`): body copy, descriptions, rules, helper text, navigation links.

Both self-hosted through the `geist` package (SIL OFL 1.1), no runtime font requests. Headings, `.text-caption` and the `.text-number*` sizes switch to mono automatically in `globals.css`; anything else that needs mono uses the `font-mono` utility.

**Fallbacks:** `ui-monospace, SFMono-Regular, Menlo, monospace` and `ui-sans-serif, system-ui, sans-serif`.

### Scale

The reference scale stops at 32px. Mind Bend adds three larger steps for numbers, because the timer and score are the hero of every screen.

| Token | Size | Line height | Tracking | Use |
|-------|------|-------------|----------|-----|
| `--text-caption` | 12px | 1.5 | 0 | Labels, metadata, tags (uppercase) |
| `--text-body` | 14px | 1.71 | 0 | Body copy, descriptions |
| `--text-heading-sm` | 18px | 1.56 | 0 | Card titles |
| `--text-heading` | 20px | 1.4 | 0 | Section titles |
| `--text-heading-lg` | 24px | 1.33 | -0.01em | Game titles on cards |
| `--text-display` | 32px | 1.25 | -0.02em | Page titles |
| `--text-number` | 56px | 1 | -0.04em | Reserved for large counters (not used in v0.2) |
| `--text-number-lg` | 88px | 0.95 | -0.05em | Result score |
| `--text-number-xl` | 128px | 0.9 | -0.06em | Result score on desktop |

**Number treatment** (from Dialed): split a number into its significant part and its fraction, and dim the fraction. `3.28` renders as `3` in `--color-paper` and `.28` in `--color-ash`. Always use tabular figures so digits do not jitter while counting.

## 4. Space, shape, layout

- **Base unit:** 8px. Tokens `--spacing-8` through `--spacing-96`.
- **Radius:** soft, Dialed-style.

| Token | Value | Use |
|-------|-------|-----|
| `--radius-card` | 24px | Game card, game tiles, daily card |
| `--radius-control` | 14px | Segmented controls, list row hovers, inputs |
| `--radius-cell` | 8px | Board cells, small tiles |
| full | 9999px | Buttons (pill), icon badges, the close button |

Nested radii step down (card 24 → control 14 → cell 8) so inner corners never look sharper than the shell around them.
- **Shadow:** cards use `--shadow-card` (see Surfaces). Nothing else casts a shadow except the floating mini boards in card art.
- **Page max width:** 1200px. Section gap 40px. Card padding 32px (24px on mobile).

### The game card

- Portrait, max width 440px, centred. 3:4 is the minimum height (586px at full width); the card grows when content needs it rather than clipping.
- On mobile the card fills the viewport width minus 16px gutters and as much height as the safe area allows.
- `.surface` (gradient + card shadow), no border.
- Inside, three zones: a header strip (game name, round `1 / 5`, close), the stage (board or stimulus), and an action strip (primary action, secondary controls).

### Home

- Greeting: first visit gets the pitch; a returning player gets their streak and today's count instead.
- Top row: the daily set card (progress `3/7` with one bar per game in its hue, the list with ticks, "continue with <next>") and the "you" card (streak, games played, longest run, a 14-day activity bar chart, and a "next up" suggestion with progress to the next tier).
- Game cards, Dialed style: `.surface`, 44px hue icon tile, title in `.title-card` (24px Geist Mono, weight 500, -0.04em), tagline, a white "play <game> →" pill, rating and suggested tier top right (or a "new" pill if never played). Card art fills the bottom: two tilted mini boards in the game's hue that bleed off the edge; the front one straightens and lifts on hover.
- Grid: 1 column on mobile, 2 on tablet, 3 on desktop with the first and last cards spanning two columns (seven cards fill three rows).

### Stats page

Totals row, training-days calendar (26 weeks, Monday first, four ember steps), skill bars on one shared 600 to 2000 scale, a per-game table that doubles as the picker for a rating-over-time chart (tier thresholds drawn as grey lines), bests per tier, recent games with rating change, and the data card (transfer code, import, reset).

## 5. Components

| Component | Spec |
|-----------|------|
| Primary button | `--color-paper` fill, black text, Geist Mono 15px weight 500, pill, 48px tall, trailing `→`. Hover: white. Press: scale 0.97. Labels name the game where they can ("play sudoku"). |
| Ghost button | White at 6% with an 8% inset ring, paper text, pill. Hover: white at 10%. |
| Ember button | Kept for destructive confirms ("yes, delete"). |
| Insight chip | Mono 12px pill on white at 6%: "2nd of 14 at medium", "12% faster than your average". "new best" is a paper pill with black text. |
| Rating panel | `.well` with rating and change, a bar in the game hue animating from the old to the new progress towards the next tier, and a caption ("139 to hard" or the level-up line). |
| Tier picker | Four segments in a row, 1px iron dividers. Active segment ember underline and paper text, inactive steel text. Selection indicator slides between segments with the spring curve. |
| Mode toggle | Daily / Practice segmented control, same mechanics as the tier picker. |
| Tag | 12px uppercase `--color-steel`, no fill, no border. |
| Icon tile | Squircle (radius 30% of size) in the game hue, black glyph, `--shadow-tile`. 22 to 44px. |
| Stat block | Uppercase caption label above a 24px number. Used for time, moves, streak, rating. |
| Hint button | Ghost pill, 40px tall. After use it locks for 5s: an iron fill sweeps out with scaleX and the label counts down ("hint · 4s"). |
| How-to-play screen | Example illustration on a void panel, numbered steps (iron number badges), a graphite tier box, controls in 13px steel, skip checkbox, back + start. |
| Toast | Bottom centre, `--color-graphite`, 1px iron border, 14px text, slides up with spring, auto-dismiss 2.4s. |

### Charts

Hand-built SVG, one series per chart in the game's hue. 2px lines with round joins, end dot r 4 to 5 with a 2px surface ring, a 10 to 18% hue wash under the rating line, hairline solid grid in `#262626`, axis text in ash. The last value is labelled; everything else is in the hover tooltip (paper pill, black text) and the table beside it. Activity uses ember in four steps (none, 1, 2 to 3, 4+ games).

## 6. Motion

Motion is the part that should feel like Dialed: physical, slightly springy, quick to start and soft to land. All motion is built with Motion (`motion/react`) or CSS transitions using these tokens.

### Easing

| Token | Curve | Use |
|-------|-------|-----|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Default for entrances, fades, layout |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.4, 1)` | Buttons, tier indicator, cells placed on the board |
| `--ease-spring-strong` | `cubic-bezier(0.26, 1.45, 0.38, 1)` | Score reveal, puzzle-solved moment |
| `--ease-in` | `cubic-bezier(0.5, 0, 0.7, 0.4)` | Exits only |

### Duration

| Token | Value | Use |
|-------|-------|-----|
| `--dur-fast` | 120ms | Hover, press |
| `--dur-base` | 240ms | Most transitions |
| `--dur-slow` | 480ms | Card stage changes, result split |
| `--dur-count` | 900ms | Score count-up |

### Signature moments

1. **Title reveal.** On a game's start screen, the title enters letter by letter, 24ms stagger, rising 8px with `--ease-out`.
2. **Commit press.** The primary action compresses to 0.97 on press and springs back on release.
3. **Cell placement.** A placed symbol or path segment scales from 0.6 to 1 with `--ease-spring`. Removing reverses with `--ease-in` at `--dur-fast`.
4. **Solve.** When a board is solved, cells ripple from the last placed cell outward (16ms per cell of distance), each doing a small scale bounce, then the board settles.
5. **Result split.** For comparison games (Recall), the card splits horizontally: your answer on top, the target below, over `--dur-slow`.
6. **Score count-up.** The score counts from 0 to its value over `--dur-count`, decelerating, then the score-band line fades in 200ms after.
7. **Wrong move.** The offending cell shakes horizontally 4px, three cycles, 240ms total.

### Rules

- Animate only `transform` and `opacity`.
- Respect `prefers-reduced-motion`: replace movement with opacity fades, keep the count-up instant.
- Input is never blocked by animation. A user can place the next cell while the last one is still settling.

## 7. Voice

Short, dry, a little cheeky. Every score band gets a line, the way Dialed does it. Lines live in each game's spec, three to five per band, picked at random.

- Lowercase game names in UI (`path`, `balance`).
- Game titles on the start card are `--text-display` (32px). Big numbers belong to timers and scores, not titles.
- Labels in uppercase captions (`TIME`, `STREAK`).
- No exclamation marks except on a perfect score.
- Instructions fit in two sentences.

## 8. Sound and haptics

- Sound off by default, toggle in the header, remembered.
- Short synthesised ticks (Web Audio, no files) for placement, solve and wrong move.
- `navigator.vibrate` for placement (8ms) and wrong move (pattern 20, 40, 20) on supported devices.

## 9. Accessibility

- Every board is fully keyboard playable: arrow keys move focus, Enter or Space acts, Backspace undoes.
- Touch targets at least 44px. Boards scale cell size down to that limit, then reduce grid size options on very small screens.
- Text contrast at least 4.5:1. Paper on void is 18.1:1, fog on carbon 9.1:1, ash on carbon 4.7:1, void on ember 5.6:1. Steel on carbon is 3.0:1, so steel is only for non-essential labels and large numbers.
- Game state is announced through an `aria-live` region.
