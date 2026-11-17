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
| `--color-cell-line` | `#6b6b6b` | 1px outline on every board cell (path, balance, blocks, sudoku). 3.3:1 on graphite, so a cell reads as a cell on the card even with no fill change |

Ember rules: primary buttons, progress bars, step numbers in start-card eyebrows and the suggested-tier dot, the path line in Path, the small tick beside the daily card label, the wordmark cursor. Never on body text, never as a large background outside a board.

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
| `--color-hue-chess` | `#c084fc` | chess |

Black glyphs and text on every hue pass 4.5:1. All pass 3:1 against the card surface. They are identity colours, not a chart palette: two hues (pink and teal) sit close for deuteranopes, and violet sits near indigo (chess and sudoku), so a hue is always paired with the game's name or icon and charts show one game at a time.

### Surfaces

| Token | Value | Use |
|-------|-------|-----|
| `--color-surface-top` / `--color-surface-bottom` | `#0e0e0e` → `#262623` | The `.surface` gradient on every card |
| `--shadow-card` | 1px white ring at 7% + drops at 1/3, 7/14, 18/36px | Resting card |
| `--shadow-card-hover` | brighter ring, deeper drops | Hovered game card, which also lifts 2px |
| `--shadow-tile` | inset top highlight + small drop | Game icon tiles |
| `.well` | white at 3% with a 6% inset ring | Stat blocks and panels inside a card |

### Board palette (games only)

Inside a game board, color is information: regions in Blocks, symbols in Balance, the stimulus in Recall. These palettes live in each game's spec (tokens in `globals.css` when a board uses them) and must:

- pass 3:1 contrast against `--color-graphite` for any filled cell
- stay distinguishable for deuteranopia and protanopia (pair hue with a symbol or pattern where meaning depends on it)
- never leak outside the board onto chrome

Every board cell has a 1px `--color-cell-line` outline. Cell fill and card are both near `#191919`, so the outline is what defines the grid. State outlines (selected, hint, related) replace it instead of stacking on top of it: selected is paper, a hint's related cells are fog.

| Token | Value | Role |
|-------|-------|------|
| `--color-balance-dot` | `#ffcf4a` | Balance dot (filled circle), amber. 12:1 on graphite, 9.4:1 on a given cell |
| `--color-balance-ring` | `#4f9dff` | Balance ring (3px outline), blue. 6.4:1 on graphite, 5:1 on a given cell |

Balance pairs a warm and a cool colour because yellow against blue is the contrast that survives deuteranopia and protanopia, and the dot is also much lighter than the ring, so the two still separate in greyscale. The shapes stay: colour speeds up reading, the shape is what carries the meaning (D-055).

Recall is the one game where the whole card becomes the stimulus color. That is the game, so it is allowed.

### Chess board (D-047, D-050)

| Token | Value | Use |
|-------|-------|-----|
| `--color-square-light` | `var(--color-slate)` (`#3a3a3a`) | Light tiles |
| `--color-square-dark` | `var(--color-iron)` (`#202020`) | Dark tiles |

The board is built like every other board: 64 rounded tiles (6px radius) with a 2px void gap, on a void panel with `--radius-control` and a 7% white ring. The squares stay neutral; the chess hue only marks what matters (last move at 34%, the hint ring and arrow). Selected: 2px paper inset ring. Check: 2px ember inset ring. Legal moves: void dots at 40%, captures as rings. Coordinates: 9px mono, fog at 60%. A wrong move gets an ember × badge, a right one a paper ✓ badge. Tiles have no cell outline: alternating tiles and the gaps already define the grid.

Pieces are Mind Bend's own set: chunky, low silhouettes on one shared rounded base, drawn as a clean outer edge with the fill on top (no seams). White is paper with a void edge, black is void with a fog edge.

### In-game clock

The running clock in a game uses `--text-heading-lg` (24px), not a number size. During play the board is the focus; the big number belongs to the result screen.

### State without color

Correct, wrong and hint states use symbols and borders, not green or red fills: `✓`, `×`, `!`, a 1px `--color-paper` outline, a shake. The only exception is a wrong cell inside a board, which may flash ember briefly.

## 3. Typography

**Geist Mono** (`--font-mono`): headings, captions and tags, buttons, the wordmark, game names, numbers inside sentences and boards.
**Space Grotesk** (`--font-num`, the `font-num` utility): every standalone number: scores, ratings and their change, bests, stat totals, clocks, countdowns (D-065).
**Geist Sans** (`--font-sans`): body copy, descriptions, rules, helper text, navigation links.

All self-hosted (`geist` package, and Space Grotesk's latin variable font in `src/app/fonts/`), SIL OFL 1.1, no runtime font requests. Headings and `.text-caption` switch to mono automatically in `globals.css`, the `.text-number*` sizes to Space Grotesk; anything else uses `font-mono` or `font-num`. `font-num` always sets tabular figures.

**Weights:** 400 for body and the big numbers, 500 for headings, game names and buttons, 700 only for the wordmark and glyphs inside boards (clues, givens, letters). Nothing else is bold.

**Tracking:** mono tightens as it grows but never past -0.04em, where Geist Mono's fixed widths start to collide. Uppercase labels get +0.07em (`.uppercase`, in the components layer so a `tracking-*` utility still wins).

**Fallbacks:** `ui-monospace, SFMono-Regular, Menlo, monospace` and `ui-sans-serif, system-ui, sans-serif`. Space Grotesk falls back to Geist Mono.

### Scale

The reference scale stops at 32px. Mind Bend adds three larger steps for numbers, because the timer and score are the hero of every screen.

| Token | Size | Line height | Tracking | Weight | Use |
|-------|------|-------------|----------|--------|-----|
| `--text-caption` | 12px | 1.5 | 0 (+0.07em uppercase) | | Labels, metadata, tags |
| `--text-body` | 14px | 1.6 | 0 | | Body copy, descriptions |
| `--text-heading-sm` | 18px | 1.45 | 0 | | Card titles |
| `--text-heading` | 20px | 1.35 | -0.01em | | Section titles |
| `--text-heading-lg` | 24px | 1.25 | -0.02em | | Game titles on cards |
| `--text-display` | 32px | 1.15 | -0.03em | | Page titles |
| `--text-number` | 56px | 1 | -0.03em | 400 | Big counters (daily set, recall score) |
| `--text-number-lg` | 88px | 0.95 | -0.035em | 400 | Result score |
| `--text-number-xl` | 128px | 0.9 | -0.04em | 400 | Result score on desktop |

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

- Hero (D-042), full bleed under the header. Behind it, a board field: 14 tilted mini boards from all seven games, drifting slowly (12px bob, 7 to 12s) and following the pointer with depth (springy parallax, mouse only). A void radial keeps the headline readable and the field melts into the page at the bottom. On mobile, five boards sit in a band above the headline.
- Hero left: terminal prompt with an ember caret, a two-line mono headline at up to 84px (paper, then steel: "Seven boards. / Fresh daily." for a first visit, the streak or boards left for a returning player), a short pitch on first visit, a white pill naming the next daily game with its icon tile, a ghost "practice" pill, and the week ramp (one bar per weekday, height by tier, today in ember).
- Hero right: the daily set card. `0/7` at `--text-number` with the fraction dimmed, today's tier pill, one bar per game in its hue, the seven games as rows, and a ticking countdown to the next set. Hovering or focusing a row lights that game's boards in the field (scale up, hue glow) and dims the rest; at rest the next unplayed game is lit.
- Below the hero, the "you" card runs horizontally: streak, played and best run, the 14-day activity bars, and the "next up" suggestion with progress to the next tier.
- Game cards, Dialed style: `.surface`, 44px hue icon tile, title in `.title-card` (24px Geist Mono, weight 500, -0.04em), tagline, a white "play <game> →" pill, rating and suggested tier top right (or a "new" pill if never played). Card art fills the bottom: two tilted mini boards in the game's hue that bleed off the edge; the front one straightens and lifts on hover.
- Grid: 1 column on mobile, 2 on tablet, 3 on desktop with the first and last cards spanning two columns (seven cards fill three rows).

### Start card

Read top to bottom in the order you decide (D-045): what the game is (icon tile, skill eyebrow, title, rules, mini board), your record (one `.well`: rating, best, played and solved in a four-column row of stat blocks, then the tier bar and its caption), then the two choices under numbered eyebrows (`01 mode`, `02 difficulty` with the tier line in paper under it), then one action row: a ghost "how to play" pill and the white "play <game> →" pill. Below 420px the row stacks with play on top. Only the play pill is filled white; everything above it is context or a choice.

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
| Tier picker | Segmented control: a 1px slate track (`--radius-control`, white at 3%, 4px padding) holding four segments. The active segment is a raised slate chip (`--radius-cell`, top highlight, small drop) with paper text; inactive segments are ash text that brightens on hover. The chip slides between segments with the spring curve. The suggested tier carries a 4px ember dot. When the tier is fixed (daily, challenge) the whole control sits at 50% opacity. |
| Mode toggle | Daily / Practice (and Challenge from a link) on the same segmented control as the tier picker. |
| Eyebrow | Section label above a choice on the start card: 12px uppercase ash, led by an ember step number (`01 mode`, `02 difficulty`) and an optional steel note (`· fixed today`). |
| Tag | 12px uppercase `--color-steel`, no fill, no border. |
| Icon tile | Squircle (radius 30% of size) in the game hue, black glyph, `--shadow-tile`. 22 to 44px. |
| Stat block | Uppercase caption label above a 24px number. Used for time, moves, streak, rating. |
| Hint button | Ghost pill, 40px tall. After use it locks for 5s: an iron fill sweeps out with scaleX and the label counts down ("hint · 4s"). |
| How-to-play screen | Example illustration on a void panel, numbered steps (iron number badges), a graphite tier box, controls in 13px steel, skip checkbox, back + start. |
| Toast | Bottom centre, `--color-graphite`, 1px iron border, 14px text, slides up with spring, auto-dismiss 2.4s. |
| Cookie card | `.surface` card fixed to the bottom, max 520px, 16px gutters on mobile, above the safe area. Caption eyebrow `COOKIES`, two sentences of fog body text with a privacy link, then accept and reject as identical ghost pills in a two-column grid (never one filled and one ghost). Rises 24px and fades in. Never blocks the page (D-053). |
| Site footer | On every page (D-066): today's daily set on a light band (`--color-paper` background, void text, top corners `--radius-card`) that clearly ends the page and always starts below the fold (content is at least `100lvh`, D-067). "today's set" eyebrow with an ember dot, "3 of 8 done. 5 left." in mono `--text-display` (the second sentence in steel, on its own line on phones; "See you at midnight." when all are done), the countdown to the next set in Space Grotesk, an 8-segment bar that fills each game's hue when its daily is done, then a white tile per game (28px icon tile, name, "done" with a hue dot, or "play →" on hover) linking to that daily. 2 columns on phones, 4 from sm, 8 from lg. Tiles lift 2px on hover (fine pointers only) and press to 0.97. A hairline, then one caption row: version, credit and streak in steel, privacy, credits and cookie settings. |
| Splash | First page load in a session (D-067). Void screen with a faint board of rounded tiles about 76px wide (6 to 24 columns, sized to the screen). The ember block cursor blinks alone, types `mind_bend` (Geist Mono 700, 28 to 48px) with a human rhythm (steady through "mind", a hesitation before the underscore, "bend" a little quicker), blinks once more, and the word lifts away. Then the tiles shrink to half size and fade while their backing fades, in a diagonal sweep from the top left (up to 840ms apart, 640ms each, strong ease-out). About 3.3s in all, slow on purpose. Pure CSS, transform and opacity only, never with reduced motion. |
| App icon | A paper prompt chevron and the ember block cursor on the raised surface gradient, 14/64 corner radius (D-060). Built by `scripts/build-icons.mjs`; never draw it by hand. |
| Link preview | 1200×630 raised card on void with a 40px radius. Wordmark top left, a terminal prompt top right in steel. Site card: two-tone mono headline and all eight icon tiles. Game card: 176px icon tile, skill eyebrow, game name in mono, tagline in fog, a soft glow in the game hue bottom right (D-061). |

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
4. **Solve.** When a board is solved, cells ripple from the last placed cell outward (30 to 40ms per cell of distance, so the biggest boards finish in under a second), each doing a small scale bounce, then the board settles.
5. **Result split.** For comparison games (Recall), the card splits horizontally: your answer on top, the target below, over `--dur-slow`.
6. **Score count-up.** The score counts from 0 to its value over `--dur-count`, decelerating, then the score-band line fades in 200ms after.
7. **Wrong move.** The offending cell shakes horizontally 4px, three cycles, 240ms total. What counts as offending, per game (D-052):
   - path: the cell you tried to step into when the rules refuse it (a wall, or a number out of order). Cells skipped by a fast drag stay still, and pushing against the same wall shakes once.
   - balance: every cell of a row, column or link the moment its ember mark appears, after the usual 600ms wait.
   - sudoku: only the number you just entered when it clashes, never the one already on the board.
   - blocks: a rectangle you release that can't be right (no clue, two clues, wrong size or shape), before it settles into its dashed outline.
   - weave: the message line on a word that is not a word. trivia: the option you picked when it is wrong. chess: the whole board on a wrong move. recall has no wrong moves.

   Board cells shake through `src/lib/shake.ts`, which adds the shake on top of any transform the cell already has, so it never fights a placement or solve animation.

### Scroll and interaction

Added with the motion layer (D-052). Tokens live in `src/lib/motion.ts` next to the easing and duration tokens.

| Token | Value | Use |
|-------|-------|-----|
| `reveal.rise` | 16px | How far a section rises as it fades in on scroll |
| `reveal.rowStagger` | 160ms | Delay across one full row, spread by each item's horizontal position |
| `reveal.amount` | 20% | Share of an element on screen before it reveals |
| `press.button` | 0.97 | Pill buttons while held |
| `press.card` | 0.98 | Game cards while held |
| `parallax.cardArt` | 14px | Card art travel across one viewport of scroll, desktop with a mouse only |

- **Reveal on scroll.** Cards and sections rise and fade in once, the first time they come on screen (`<Reveal>`). Items in a row stagger left to right. Anything on screen at load plays straight away.
- **Count-ups and fills.** Stat totals count up from zero when they come into view. Tier bars fill and the activity bars grow from the baseline the same way.
- **Hero on scroll.** The board field drifts upward faster than the page as you scroll past the hero, deeper boards faster, and fades to 15%.
- **Header.** Transparent at the top of the page. Its bar, blur and hairline fade in once you scroll.
- **Game cards.** Hover lifts the card 2px, springs the icon tile (tilt and scale with `--ease-spring-strong`) and brings up a soft glow in the game's hue behind the boards. Press compresses to `press.card`.
- **Streak.** The header pill springs and its ember dot pulses the first time you see your streak go up.


### Rules

- Animate only `transform` and `opacity`.
- Respect `prefers-reduced-motion`: replace movement with opacity fades, keep the count-up instant. A global `MotionConfig` applies this to every Motion animation; scroll drift and parallax switch off, and the wrong-move shake becomes a short opacity dip.
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
- Touch targets at least 44px. Boards scale cell size down to that limit, then reduce grid size options on very small screens. Exception: chess squares are about 42px on a 390px phone, since an 8×8 board can't shrink its grid (D-047).
- Text contrast at least 4.5:1. Paper on void is 18.1:1, fog on carbon 9.1:1, ash on carbon 4.7:1, void on ember 5.6:1. Steel on carbon is 3.0:1, so steel is only for non-essential labels and large numbers.
- Game state is announced through an `aria-live` region.
