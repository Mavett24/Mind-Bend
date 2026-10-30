# Decision Log

Every decision that shaped the product, with the reason. Newest at the bottom. Format: what, why, what we gave up.

---

### D-001 · Own brand, Dialed's motion principles
**2026-10-26**
We take Dialed's interaction and motion principles (card as stage, springy easing, count-up scores, voiced result lines) but not its look, logo or wordmark.
**Why:** a clone would erase the design work in the case study, and the visual identity is Dialed's IP. Motion principles are transferable craft.
**Gave up:** the exact Dialed aesthetic.

### D-002 · Original game names
**2026-10-26**
Mechanics inspired by LinkedIn's Zip, Tango, Patches and Wend ship under our own names: Path, Balance, Blocks, Weave (working titles).
**Why:** game mechanics are free to use, names and visuals are not.

### D-003 · Generated puzzles with a uniqueness check
**2026-10-26**
Every logic board is procedurally generated from a seed and accepted only if a solver proves exactly one solution.
**Why:** variance is the product. Without a uniqueness check, hard boards become guessable or broken.
**Gave up:** hand-tuned puzzles. Generation cost is paid at play time, so generators must stay fast (target under 100ms per board on a phone).

### D-004 · One seeded generator for daily, practice and challenge
**2026-10-26**
Daily boards seed from the UTC date plus game id. Practice uses a random seed. Challenge links carry the seed in the URL.
**Why:** three features from one mechanism, all deterministic and testable.

### D-005 · No backend in v1
**2026-10-26**
Stats, streaks and skill ratings live in localStorage.
**Why:** fastest path to shipping, free hosting, no accounts.
**Gave up:** cross-device sync and global leaderboards. Revisit if the app gets real users.

### D-006 · Stack: Next.js, TypeScript, Tailwind v4, Motion, Vitest
**2026-10-30**
Same base as the portfolio. Deployed on Vercel's free Hobby plan from a private GitHub repo.
**Why:** known stack, preview URL per branch, zero hosting cost.

### D-007 · Axiom as the visual base
**2026-10-30**
The Axiom style reference (terminal-grade dark, monospaced, flat, one orange accent) is the visual base. Stored at `docs/reference/axiom-style-reference.md`.
**Why:** chosen by Mavett. Fits the "train your brain like an engineer" angle and his black and orange preference.

### D-008 · Axiom geometry wins over Dialed geometry (superseded by D-014)
**2026-10-30**
Dialed uses 24px radius and deep soft shadows. Axiom uses 2px radius and no shadows. We keep Axiom's geometry and take only Dialed's motion.
**Why:** mixing soft cards into a sharp, flat system would read as two brands. Motion carries the playfulness instead.

### D-009 · Ember is the primary action color
**2026-10-30**
The reference contradicts itself: its colour table says not to use Ember for the primary CTA, while its components and Do's use it exactly there. We use Ember for primary actions, progress and active states.
**Why:** a game needs one unmistakable "go" affordance, and the components section is the more specific source.

### D-010 · Black text on Ember buttons
**2026-10-30**
The reference specifies `#eeeeee` text on Ember. That pairing is 3.3:1, below WCAG AA for 16px text. We use `#000000` on Ember (5.6:1).
**Why:** accessibility, and it reads more like a terminal selection highlight.

### D-011 · JetBrains Mono replaces BerkeleyMono (superseded by D-015)
**2026-10-30**
**Why:** BerkeleyMono requires a paid licence. JetBrains Mono is the first listed substitute, free, and available through `next/font`.

### D-012 · Extended number scale
**2026-10-30**
Added `--text-number` (56px), `--text-number-lg` (88px) and `--text-number-xl` (128px) above the reference's 32px ceiling, used only for timers and scores.
**Why:** oversized numbers are core to the Dialed feel and to a game's readability at a glance.

### D-013 · Color lives inside the board
**2026-10-30**
Axiom bans colored surfaces. Games need color as information (regions, symbols, the Recall stimulus). Color is allowed only inside a game board, never on chrome.
**Why:** keeps the system's discipline while letting games work. Recall is the explicit exception where the whole card is the stimulus.

### D-014 · Soft corners
**2026-10-30** · supersedes D-008
Cards use a 24px radius, controls 14px, board cells 8px, buttons are pills. Surfaces stay flat (no shadows).
**Why:** Mavett preferred Dialed's soft geometry. Soft shapes make the app feel like a toy you want to touch, and the flat black surfaces keep it from turning into generic SaaS.
**Gave up:** Axiom's sharp, terminal-strict silhouette.

### D-015 · Geist Mono for headings, Geist Sans for body
**2026-10-30** · supersedes D-011
**Why:** an all-mono interface reads as a code editor and gets tiring in longer text like rules and descriptions. Mono keeps the engineered character where it matters (headings, labels, numbers), sans makes everything else easier to read. Geist is free and self-hosted through the `geist` package.

### D-016 · Smaller titles, big numbers only for scores
**2026-10-30**
The game title on the start card dropped from 88px to 32px, and the home headline from 48px to 32px.
**Why:** at 88px the title dominated the card and competed with the controls. Oversized type is reserved for timers and scores, the moments it is meant to celebrate.

### D-017 · Unique paths by ruling out alternatives
**2026-10-30**
When the path solver finds a second solution, the generator rules it out at the first step where it leaves the true path: either a wall on that step, or two checkpoints whose order the alternative cannot respect.
**Why:** both fixes are guaranteed to kill that alternative, so generation converges quickly. Random extra checkpoints might not.
**Gave up:** some control over exact checkpoint counts per tier. Counts are measured and documented instead.

### D-018 · Balance boards must be solvable without guessing
**2026-10-30**
A balance board is accepted only if a deduction solver finishes it: rules only on Easy to Hard, one step of lookahead on Expert.
**Why:** principle 2 (every puzzle is fair). It also proves uniqueness for free, and tests confirm it with brute force.
**Gave up:** the very hardest boards that need deep trial and error. Those feel like guessing, not reasoning.

### D-019 · Daily boards don't move your rating
**2026-10-30**
Daily results update streak and best times. Rating only moves on practice and challenge boards.
**Why:** the daily board is the same for everyone and can be replayed, so it would be easy to farm. Practice is where your rating should come from.

### D-020 · In-game clock at 24px
**2026-10-30**
The running clock uses `--text-heading-lg`, not `--text-number` as first specified.
**Why:** after the start card title felt too loud (D-016), a 56px clock above the board would compete with the puzzle. The big number stays on the result screen.

### D-021 · Generation runs on the main thread for now
**2026-10-30**
Boards are generated synchronously when a game starts, while the start card animates out.
**Why:** measured generation is fast (Expert path ~55ms median on a server CPU, under 300ms worst case). A Web Worker adds complexity for no visible gain yet. Revisit if a low-end phone shows a stall.

### D-022 · Scored games, and how points move the rating
**2026-10-30**
Games can report a 0 to 10 score instead of a time (recall does). Bests are kept per tier, score bands are 8+, 5+ and below. For rating, 4/10 or less counts as a loss and 9/10 or more as a full win.
**Why:** a straight points/10 mapping made a 2/10 on Hard raise a new player's rating, because Elo expected even less. Anchoring the loss at 4/10 makes the rating mean what it says.
**Also:** score bands were renamed from fast/average/slow to high/mid/low so one vocabulary covers both timed and scored games.

### D-023 · Recall picks in OKLCH, scores in CIEDE2000
**2026-10-30**
The picker uses three OKLCH sliders. Scoring uses ΔE00 on the colours actually displayed.
**Why:** OKLCH makes equal slider steps look like equal changes, so the picker feels fair. CIEDE2000 is the standard measure of how different two colours look to people, the closest equivalent to Dialed's psychoacoustic scoring for sound.
**Gave up:** Dialed's familiar hue/saturation/brightness sliders, which are less even perceptually.

### D-024 · Blocks palette from Okabe-Ito, plus shape glyphs
**2026-10-30**
Rectangles use eight colour-blind-safe hues, all at least 5.9:1 against the cell colour, and each clue also shows its shape glyph.
**Why:** colour carries meaning here, so it can't be the only signal. Touching rectangles never share a colour (tested).

### D-025 · Blocks taps never place a rectangle
**2026-10-30**
A press without movement removes the rectangle under it, or does nothing. Drags clamp to the board edge.
**Why:** playtesting found that every stray tap left a dashed 1×1 box, and drags that slid off the board collapsed into one. No clue has area 1, so a 1×1 is never intended. The rules moved into a pure, tested `applyGesture`.

### D-026 · Weave asks for the grid's hidden words
**2026-10-30**
A word counts only when it matches one of the hidden words over exactly its cells. Other real words are acknowledged ("a word, but not hidden here") without penalty.
**Why:** the first spec accepted any valid cover of the grid, which needs an expensive solver to tell players when a found word blocks a finish. Matching the hidden words, as Strands does, gives a clear goal and makes hints meaningful.
**Gave up:** credit for clever alternative covers.

### D-027 · Trivia is ten timed questions, scored out of 10
**2026-10-30**
Both modes have ten questions with a per-question timer. A right answer is worth 0.7 plus up to 0.3 for speed.
**Why:** the first spec had higher or lower as an endless streak, which doesn't fit the shared scored flow, daily boards or bests per tier. Ten questions keeps games short and comparable, and the speed bonus separates "knew it" from "guessed it".
**Gave up:** the open-ended streak format.

### D-028 · Trivia questions from OpenTriviaQA, filtered by script
**2026-10-30**
Open Trivia DB's API isn't reachable from the build environment, so questions come from OpenTriviaQA (CC BY-SA 4.0) on GitHub, filtered automatically. TV was dropped as too niche. The question set has no difficulty labels, so tiers change time and options instead.
**Known limitation:** uneven quality and small typos. A curation pass, or swapping in Open Trivia DB through a build step with network access, is on the roadmap.

### D-029 · Boards can load content before they start
**2026-10-30**
A game's `generate` may be async. The play session shows "building board" and starts the clock only once the board is ready. Weave loads its word list this way; trivia loads its question file once a mode is picked.
**Why:** word lists and question banks are hundreds of KB. Loading them up front would slow the home screen for everyone.

### D-030 · How-to-play screen before every board
**2026-10-30**
Pressing play shows a how-to-play screen first: a small illustrated example, three steps, what the chosen difficulty means, and the controls. A "skip this screen next time" option is remembered per game, and "how to play" on the start card always reopens it. "Next board" after a result goes straight to the board.
**Why:** Mavett asked for instructions before playing. Several games (blocks, balance, recall) are hard to guess from the board alone.

### D-031 · Difficulty described in plain words
**2026-10-30**
Every game has one line per tier saying what that tier changes ("4 colours, shown for 3 seconds, rebuild 2"). It shows under the difficulty picker and on the how-to-play screen.
**Why:** "hard" on its own meant nothing in recall. The tier labels are now backed by what actually changes.

### D-032 · Hints with a 5 second cooldown
**2026-10-30**
Path, balance and weave have a hint button that locks for 5 seconds after use, with a visible sweep and countdown. Hints are counted on the result screen but don't change the score.
**Why:** hints help players learn and get unstuck, the cooldown stops them being spammed to auto-solve.

### D-033 · Balance hints explain, they don't fill
**2026-10-30**
A balance hint highlights a cell and names the rule that forces it. The player places the symbol.
**Why:** the app is for getting better. Seeing the rule teaches the deduction; filling the cell would skip it.

### D-034 · Weave follows Wend: no diagonals, empty tiles, length slots
**2026-10-30** · amends D-026
Moves are up, down, left and right only. Each board has scattered empty tiles, and the length of every hidden word is shown as a row of boxes.
**Why:** Mavett compared it with the real game. Orthogonal moves make the routes a real logic puzzle, and the length slots give a goal you can reason with ("I still need a 7").

### D-035 · Recall's ready step only opens the game
**2026-10-30** · amends the recall rework
The ready screen ("3 colours, shown for 3 seconds") shows once, before round 1. Later rounds start as soon as the player taps "next round".
**Why:** Mavett found the instructions repeating after every round. The how-to-play screen and the first ready step already explain the game; repeating it broke the flow.

### D-036 · Sudoku joins the lineup with the same difficulty system
**2026-10-30**
Sudoku uses the same machinery as balance: a seeded generator, a human-style logic solver that gates every removal (so boards are unique and need no guessing), and a grade by technique. Easy is 6×6 like LinkedIn Mini Sudoku, the rest are 9×9. Hard and expert are defined by how many advanced deductions they require, not just by how few numbers are given.
**Why:** given count alone is a weak measure of sudoku difficulty. A 26-given board can be trivial or brutal; the techniques it needs decide how it feels.
**Gave up:** a strict "expert always needs triples or X-wing" rule. Only about 1 in 10 random boards needs them, which made generation slow (~0.5s+). Expert instead needs at least 3 advanced steps and allows triples and X-wing when they appear.

### D-037 · Dialed-style raised cards
**2026-10-30** · replaces the "flat, layered darkness" principle
Cards are now raised surfaces: a top-to-bottom gradient (#0e0e0e to #262623), a 1px light ring and three layered drop shadows, measured from Dialed. Each game card carries art: two tilted mini boards that bleed off the bottom edge and lift on hover.
**Why:** Mavett asked for the app to take its look from Dialed. Depth on the cards gives the home screen the same tactile, collectible feel, while the black page keeps the terminal mood.
**Gave up:** the strict "no shadows, no gradients" rule from the Axiom base.

### D-038 · White primary pills, a hue per game
**2026-10-30** · amends D-010
Primary buttons are paper pills with black text. Each game owns one bright hue for its icon tile, card art, rating bar and chart line. Ember stays as the brand mark: wordmark cursor, streak, pickers, activity calendar.
**Why:** with seven bright icon tiles on screen, ember buttons competed with them. White pills read as the action on every card, and the hues make games recognisable at a glance, like Dialed's colour tiles.
**Gave up:** "colour belongs to the board". Guardrail: a hue never carries meaning alone, it always sits next to the game's name or icon.

### D-039 · Local-first score history, no backend
**2026-10-30** · replaces the per-game totals of D-019
Every finished or abandoned game is saved as one record (game, tier, mode, seed, time or points, hints, rating result) in the browser. Ratings, bests, streaks, solve rates, the activity calendar and suggestions are all worked out from that list. Totals saved by v0.6 are migrated once as a starting point. A transfer code (base64 JSON) moves history between devices; imports merge by record id.
**Why:** the site has to remember players across visits without accounts. Keeping raw records means one source of truth that can't drift, new stats need no migration, and a later cloud sync only has to upload the same records.
**Gave up:** sync across devices without a manual code, and protection against clearing site data. A free database on Vercel can be added later without changing the record format.

### D-040 · Scores that steer what you play
**2026-10-30**
The rating now drives decisions instead of decorating them: the start card opens on the tier your rating suggests, a bar shows progress to the next tier, the result screen announces a level-up and offers the next board at the new tier, and the home screen's "next up" points at an unfinished daily set, an untried game, your weakest rating (50+ below your average) or the game you've neglected longest. Results are placed in context: rank among your solves at that tier, change against your recent average, new best.
**Why:** Mavett asked for a scoring system that serves a purpose. A number only matters if it changes what happens next.

### D-041 · Hints cost rating, quits are recorded
**2026-10-30** · amends D-032
Each hint takes 15% off a solve's rating result, down to 40%. Leaving a board after 5 seconds is saved as a quit: it shows in the solve rate and recent games but doesn't change the rating.
**Why:** if hints were free, a player could hint through hard boards and climb tiers they can't solve, and the suggested tier would stop meaning anything. Quits keep the solve rate honest without punishing someone for closing a tab.
**Gave up:** counting quits as losses, which would be stricter but would also punish accidental exits.

