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
The Axiom style reference (terminal-grade dark, monospaced, flat, one orange accent) is the visual base. It was stored at `docs/reference/axiom-style-reference.md` and removed before the repo went public (D-059), since it described another product's interface; DESIGN.md is the system now.
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

### D-042 · A home hero that shows the games
**2026-10-30**
The home screen opens on a full-bleed hero instead of a greeting line and two cards. Mini boards from every game float behind a big mono headline and react to the pointer; the daily set sits in front as the main object, with a countdown to the next set and the week's difficulty ramp. Pointing at a game in the set lights its boards in the background.
**Why:** Mavett asked for a hero that slaps and is more engaging. The boards show what the app is before anyone reads a word, and linking the set to the field makes the first screen respond to you. The headline uses number-sized type because on the home screen the hook is the message, not a timer.
**Gave up:** the "you" card next to the daily set above the fold (it moves below the hero) and the rule that type above 32px is for numbers only.

### D-043 · Every board cell gets an outline
**2026-11-02**
Path, balance, blocks and sudoku cells now carry a 1px outline in a new token, `--color-cell-line` (`#6b6b6b`). It reaches 3.3:1 against the cell fill, the WCAG bar for shapes you need to see to play. State outlines take its place rather than stacking on it: the selected sudoku cell is paper, cells a hint points to are fog, the hinted cell keeps its 2px pulse.
**Why:** after the raised-card redesign (D-037) the cell fill and the card behind it are the same dark grey (1.01:1), so empty cells disappeared and the grid only showed where something was placed. Playtesting flagged it as hard to read. An outline fixes it without lifting the cell fill, which would have eaten into the contrast of the dots, numbers and region colours on top.
**Gave up:** the borderless, floating-tile look of the cells. Steel (`#606060`) was the closest existing token but sits at 2.8:1, so a new token was worth it.

### D-044 · Sudoku is 6×6 at every tier, difficulty is the givens
**2026-11-02** · replaces the tiers in D-036
Every tier is a 6×6 grid, solvable with singles only. Tiers differ by how many numbers you start with: 18 on easy, 14 on medium, 12 on hard, 9 on expert. Pars drop to 45s, 75s, 2 min and 3 min.
**Why:** playtesting found the 9×9 tiers far too hard and not what the game is for. Mavett wants the LinkedIn Mini Sudoku feel at every level: a quick board you finish, where more help makes it easier and less help makes it harder. Givens are a difficulty you can see before you start, and every board still has one solution with no guessing.
**Gave up:** classic 9×9 sudoku and the technique ladder (pairs, pointing, X-wing) that defined hard and expert. The solver keeps those techniques, so a 9×9 mode can come back later as its own option.

### D-045 · Start card reads in the order you decide
**2026-11-02** · amends the tier picker and mode toggle in DESIGN.md §5
The start card now has three clear zones. Your record shrinks into one panel (rating, best, played, solved in one row, then the tier bar). The two choices get numbered eyebrows, `01 mode` and `02 difficulty`, and sit on segmented controls with a visible slate stroke and a filled chip on the active option. "How to play" becomes a ghost pill next to the white play pill, so there is one obvious primary action and one secondary one. When daily or a challenge fixes the tier, the tier control dims and its eyebrow says so.
**Why:** playtesting found it unclear what to click. The stats panel was the loudest thing on the card, the controls had near-invisible iron strokes so they read as plain text, and the only selection cue was a 2px underline. Eyebrows, strokes and fills put the weight on the choices and the play button.
**Gave up:** the ember underline as the active-segment marker (ember now marks step numbers and the suggested tier instead), the large rating number on the start card, and the tier name in the "best" label (the picker already shows it).

### D-046 · chess puzzles come from the Lichess database, not a generator
**2026-11-02** · an exception to "never the same board twice" in PRODUCT.md
chess serves a curated set of 16,522 puzzles from the Lichess puzzle database (CC0), filtered for settled ratings, popularity and play count, every move checked with chess.js and every solution tested. Bands of 200 rating points ship as static files and load on demand.
**Why:** a fair tactic needs an engine-verified line with exactly one winning move at each step, and a rating that reflects how real players fare on it. Generating that means running Stockfish over real games, which is a project in itself and would still need human play data to rate the puzzles. Lichess has done both for millions of puzzles and released them into the public domain. The licence-free source also keeps the private repo clean.
**Gave up:** generation for this one game, and with it infinite variety. With about 2,000 puzzles in each 200-point band, a player meets new puzzles for months, and the build script takes the full database when we want more.

### D-047 · chess gets its own board, pieces and session
**2026-11-02** · amends DESIGN.md §2 (board palette), §9 (touch targets)
The board is built in house: violet-tinted squares (two new tokens), our own flat piece set, transform-only piece glides, hue for the last move and hints, ember only for check and a wrong move, chess.js for the rules. chess runs its own session instead of the shared board flow: puzzle after puzzle on one board, with the result beside it.
**Why:** a stock board and Staunton pieces would look pasted in. Tinting the squares with the game's hue makes the board belong to chess the way the orange path belongs to path. chessground, the usual board library, is GPL, so it was out. The shared flow's separate result screen is right for a two-minute board and wrong for a ten-second puzzle; chess.com's loop works because the next puzzle is one tap away.
**Gave up:** the 44 px touch target on small phones (squares are about 42 px at 390 px wide, the board already runs edge to edge in the card) and the uniform result screen across games.

### D-048 · Puzzle Elo for chess, on its own scale
**2026-11-02**
chess rates you against each puzzle's own rating, chess.com style: start at 1200, K of 64, then 40, then 24 as you settle, ratings 100 to 3300. A clean solve always gains at least 1. The piece hint halves the gain and the move hint removes it, but hints never cost rating. A speed bonus of up to 4 points is earned by solving within the puzzle's target time, which scales with its rating and length. The record stores the puzzle rating and the bonus, and the rating is still derived from history (D-039).
**Why:** the other games rate you against a tier's nominal rating because their boards have no rating of their own. Lichess puzzles do, which is what makes chess.com's system feel fair: hard puzzles pay more and cost less. Hints are scaled on the gain, not the result, so using one on an easy puzzle can't push you down, which matches Mavett's brief that hints affect how much you win. The bonus is small next to K so speed rewards rather than dominates.
**Gave up:** one shared rating scale. Chess sits on its own tactics skill bar (400 to 2800), its rating chart has no tier lines, and the "lowest rating" suggestion leaves it out because 1500 in chess and 1500 in path mean different things. The 15% hint rule (D-041) does not apply to chess.

### D-049 · The chess daily is three rated puzzles that ramp
**2026-11-02** · an exception to "daily boards don't move your rating" (D-039)
The chess daily is three puzzles at about 1300, 1700 and 2100, the same for everyone, and each one is rated on your first attempt. It counts as done once all three are played, solved or not.
**Why:** Mavett wanted the chess.com feel, where the daily matters. Puzzle Elo makes a shared set fair without tailoring it: a strong player gains little on the first and risks a lot, a newer player risks little on the third and gains a lot. A shared set keeps the "did you get all three?" moment.
**Gave up:** consistency with the other games' unrated dailies, and a daily set tuned to each player's level.

### D-050 · The chess board is built like our other boards
**2026-11-02** · amends the board look in D-047
The board is now 64 rounded tiles (6px radius) with a 2px void gap on a void panel, in the app's own neutrals: slate for light tiles, iron for dark. The violet hue only marks the last move and hints. The pieces were redrawn: chunky, low silhouettes on one shared rounded base, drawn as an outer edge with the fill on top so overlapping parts no longer show seams. White is paper with a void edge, black is void with a fog edge.
**Why:** Mavett found the first pieces stretched and the board not modern enough. The tall, narrow pieces with an outline around every part looked like a classic set traced in vector, and the violet checkerboard read as a theme from another app. Every other Mind Bend board is rounded tiles on black, so the chess board now is too, and the hue goes back to marking state, as it does in path.
**Gave up:** the violet-tinted squares (the two tokens now alias slate and iron) and the slightly taller, more traditional piece proportions.

### D-051 · trivia shows the seconds left, not just a bar
**2026-11-02** · amends the time bar in docs/games/trivia.md
Each question now shows a countdown in the header, whole seconds in paper and the tenth dimmed in ash, at the size of the chess clock. The 4px bar under it grows to 6px and is driven by the same 100ms tick as the number, so the two always agree. Both freeze when you answer, and the number turns fog. The running score moves to the left of the row, under the question count, with the same split treatment.
**Why:** playtesting found players couldn't tell how much time was left. A thin bar shows the share of time gone, but not whether 4 seconds is enough to read four options. A number answers that at a glance, and the design rule is that timers are the hero of the screen. One clock for both also removes the bar's own 15 second tween, which in testing could snap straight to empty.
**Gave up:** the quieter header where the bar was the only time cue, and the score in the top right corner.

### D-052 · A motion layer for scrolling, pressing and wrong moves
**2026-11-02** · extends DESIGN.md §6
Sections and game cards now reveal the first time they scroll into view instead of on page load, staggered left to right by where they sit in their row. Stat totals count up, tier bars fill and activity bars grow when they come into view. The hero's board field drifts up and fades as you scroll past it, the header bar only appears once the page has scrolled, game cards spring their icon and glow in their hue on hover and compress on press, card art has a light scroll parallax on desktop, and the streak pill bumps when your streak goes up. The wrong-move shake, until now only in weave, trivia and chess, reaches path, balance, sudoku and blocks, each with its own rule for which cell is at fault. Every Motion animation now follows the reduced-motion setting through one `MotionConfig`.
**Why:** animations that run on mount played offscreen for most of the home grid on a phone, so nobody saw them. Touch screens had no press feedback on cards at all. And a mistake on four of the logic boards was only ever a colour change, which is easy to miss mid-drag. The shake rules aim the blame at the player's own move (the refused step, the number just entered, the rectangle just drawn) so it reads as feedback, not as noise. Reduced motion was only honoured by components that checked it themselves.
**Gave up:** the instant, everything-at-once page load; a chart line that draws itself in (it would animate stroke, not transform or opacity); shaking the earlier number in a sudoku clash; and parallax on phones, where it costs battery and fights the scroll.

### D-053 · Google Analytics only after an explicit accept
**2026-11-02** · adds the consent banner and `/privacy`
Google Analytics 4 runs only after the visitor clicks accept on a cookie card at the bottom of the screen. Before that, the Google script is not in the page at all (Consent Mode v2 in Basic mode). After accept, every consent signal starts denied and only `analytics_storage` is granted; the three ad signals stay denied because Mind Bend runs no ads. Accept and reject are identical ghost pills, the card never blocks play, and "cookie settings" in the footer reopens it. Rejecting after an accept deletes the `_ga` cookies and reloads the page. The choice is stored in local storage with a version and a timestamp and expires after 12 months. GA cookies last 13 months instead of Google's two years, Google signals and ad personalisation are off in the tag as well as in the property, and GA only exists where `NEXT_PUBLIC_GA_ID` is set (Production on Vercel). Accounts and a database are parked: local-first history stays the only storage (D-039).
**Why:** the Dutch regulator says GA does not qualify for the analytics exemption in the Telecommunicatiewet, so it needs opt-in consent. Basic mode is the strict reading: Advanced mode's cookieless pings before consent are disputed, and the modelling they feed needs far more traffic than a new app has. Two equal buttons is the simplest banner that meets the rules against dark patterns, and with one optional category there is nothing for a preferences layer to hold. GA4 over cookieless tools because the event, funnel and exploration work in the next ticket needs it.
**Gave up:** data from everyone who rejects or ignores the banner, so GA undercounts traffic and has no baseline to measure the consent rate against. Known risk: the EU-US Data Privacy Framework that covers Google's US transfers is under appeal at the Court of Justice (C-703/25 P); if it falls, GA needs another look.

### D-054 · A footer that signs off
**2026-11-02** · replaces the one-line footer, extends DESIGN.md §5
The footer is now on every page and has a job: a terminal sign-off prompt, the slogan "Built to bend minds." in the hero's two-tone mono, the countdown to the next daily set as a card that links to it, every game as a hue tile, and a giant graphite wordmark sinking into the bottom edge. Privacy and cookie settings stay in one small caption row with the version and the credit.
**Why:** Mavett found the old footer too minimal for an app with this much character. The bottom of a page is where someone who scrolled all the way decides what to do next, so it should send them back into a game, not just list credits. The old line, "Inspired by LinkedIn Games, Dialed and Lessgames. Everything here is original.", undersold the app by naming other products at the exact moment it should be selling its own; the credit to those products lives in the README and the case study. The legal links stay small on purpose: they need to be findable, not featured.
**Gave up:** the quiet single line, and naming the inspirations in the product itself.


### D-055 · balance symbols get a colour each
**2026-11-09** · adds a board palette to DESIGN.md §2 and docs/games/balance.md
Dots are now amber (`#ffcf4a`) and rings blue (`#4f9dff`), on the board, on given cells and in the how-to-play example. The shapes stay exactly as they were: a filled circle and a 3px ring.
**Why:** players found the two symbols hard to tell apart at a glance. Both were paper on graphite and close in size, so telling them apart meant reading each cell's shape, which slows down the counting the game is built on (three in a row, equal per line). Colour lets the eye group a row before reading it. Yellow against blue is the pair that survives red-green colour blindness, and the dot is much lighter than the ring, so the difference holds in greyscale too. Keeping the shapes means colour is never the only cue, as DESIGN.md requires.
**Gave up:** the all-monochrome board, and the teal game hue on the board itself (it would have been one colour for two meanings). Card art keeps its teal and paper look, since it is identity, not play.

### D-056 · Dragging over the path line never erases it
**2026-11-09** · amends the interaction in docs/games/path.md
During a drag, the line only grows or steps back onto the previous cell. Passing over any other part of the line is ignored, so the player keeps dragging from the line end. Cutting the line back to an earlier cell now takes a press on that cell. Arrow keys follow the drag rule. The rule lives in the engine as `stepLine` and is tested.
**Why:** a drag that crossed the line cut it back to the crossing point, so one slip near the end could wipe most of a nearly solved board, and the player had to remember and redraw the route to finish. That punishes speed, the very thing the game scores. A deliberate step back is still one cell at a time, so undoing stays as easy as before.
**Gave up:** cutting the line with a sweep through it mid-drag. It was a fast way to undo a lot at once, and it now takes a lift and a press.

### D-057 · Dragging in blocks never erases a finished rectangle
**2026-11-09** · amends the interaction in docs/games/blocks.md, same idea as D-056 for path
A drag still places a rectangle and still replaces rectangles that don't fit a clue. It no longer replaces a rectangle that does fit its clue: if the new one would overlap it, the preview turns ember with "in the way", nothing is placed on release, and the finished rectangle shakes. Removing it takes a tap. The rule lives in the engine (`applyGesture`, `blockersOf`) and is tested by sweeping drags across a solved board.
**Why:** drawing a new rectangle whose edge clipped a neighbour silently deleted the neighbour, the same lost-work problem path had. A rectangle that fits its clue is real progress; a dashed one can never be part of the answer, so replacing it costs nothing and keeps quick corrections quick.
**Gave up:** redrawing a finished rectangle bigger or smaller in one drag. It is now a tap, then a drag.

### D-058 · blocks board: colour means done, and the board explains itself
**2026-11-09** · amends docs/games/blocks.md and the how-to-play example
Clue numbers are paper on a raised cell instead of each in its own colour. A rectangle that fits becomes a solid piece in its clue's colour (opaque 24% fill, so the grid inside disappears). While you drag, a label gives a live verdict: fits, wrong area ("4 of 6"), wrong shape ("needs" plus the shape), no number or two numbers. A wrong rectangle keeps that label on a tab across its top edge. A row under the board says how to start, why a drag was refused, and how many rectangles fit ("placed 5/9").
**Why:** Mavett found the board unintuitive with no visual hierarchy. Every clue was coloured from the start, so a fresh board looked as busy as a finished one and colour said nothing about progress. Placed rectangles were tints over the cell grid, so they read as coloured cells rather than pieces. A wrong rectangle showed only its area, in a badge that could sit on top of a clue, and the preview only showed the area, so you learned whether a rectangle fit after letting go. Blocks also had no status row while path and balance do. The verdict never reveals more than a placed rectangle already did, just earlier, so it doesn't make the puzzle easier.
**Gave up:** the colour-coded clues, which gave each number an identity before it was solved, and the lighter, more transparent pieces.

### D-059 · Getting the repo ready to be public
**2026-11-09** · adds `/credits`, licence notices and SECURITY.md
Before the repo goes public, the whole history was checked for secrets and personal data (nothing found), and the open-data licences are now met where the data is shown, not only in the README. The app has a `/credits` page linked from the footer, and trivia and chess credit their sources on the how-to-play screen. The trivia folder carries its own licence file (questions under CC BY-SA 4.0, `higher-lower.json` under the ODbL because it uses mledoze/countries), the SCOWL copyright notice ships with the word lists, and `THIRD_PARTY_NOTICES.md` lists every data source and shipped package. The README states that Mind Bend is not affiliated with the products that inspired it. The Axiom style reference was removed from `docs/reference/`.
**Why:** CC BY-SA, CC BY and the ODbL all ask for credit where the material is used, and the app showed questions and figures with no credit at all. The ODbL also covers the higher or lower file as a whole, which the docs didn't say. A public repo is a showcase, so it should show the product handled like a real one: clear licences, a way to report security issues, and no third-party material that isn't ours to publish. The Axiom file was a reconstruction of another product's interface; the decisions that credit it as the starting point stay.
**Gave up:** a footer with only privacy in it, and the style reference as a working file.

### D-060 · An app icon from the wordmark cursor
**2026-11-17** · replaces the default Next.js favicon
The icon is a terminal prompt on the raised dark surface: a paper chevron and the wordmark's ember block cursor. It ships as an SVG for modern browsers, an ICO with 16, 32 and 48 px for the rest, a 180 px Apple touch icon, and 192, 512 and maskable 512 px icons in a web manifest. `scripts/build-icons.mjs` draws all of them from one mark with the colour tokens, so a change to the mark is one script run.
**Why:** the tab showed the Next.js logo, which reads as an unfinished project the moment someone opens a shared link. The prompt and cursor are already the brand (header, hero, footer), and two bold shapes still read at 16 px where the full wordmark would not.
**Gave up:** a letter mark ("m" or "mb"), which needs a font at 16 px, and a different icon per game.

### D-061 · Link previews for the site and every game
**2026-11-17** · adds Open Graph and X cards, sitemap, robots, canonical URLs
Shared links now unfurl with a 1200×630 card. The site card shows the wordmark, "Eight games. Fresh daily." and all eight icon tiles. Each game has its own card (icon, skill, name, tagline, a glow in its hue), which is also what a challenge link shows. The cards are drawn at build time by next/og from the design tokens and the Geist fonts, so they stay in step with the app. Game pages get their own preview title and description, every page has a canonical URL (challenge links point back to the game), and there is a sitemap and a robots file that keeps `/stats` out of search and lets AI crawlers in.
**Why:** launch traffic comes from links on Reddit, LinkedIn and chats, and a bare URL with no image gets far fewer clicks. Per game cards make challenge links ("beat my time on this board") look like an invitation to that game, not to a homepage.
**Gave up:** cards that show the actual board for a seed (heavier to build, every challenge would need its own image), and per page copy for SEO, which comes with the how to play pages.

### D-062 · Game events in GA4, counted from the history
**2026-11-17** · adds `src/lib/events.ts`, `src/lib/track.ts`, `docs/ANALYTICS.md`
Ten events describe play: game_start, game_complete, game_abandon, level_up, first_game_complete, daily_set_complete, hint_used, share, tutorial_begin and tutorial_complete, each with the game, tier and mode. The ending of a game is built from the history record it creates, so GA and the stats page count the same games (a quit after 5 seconds or more, nothing for a shorter visit). Closing the tab mid-board, which the history never sees, sends a GA-only abandon. GA4's recommended names are used where one fits, so its built-in reports understand them. GA loads only on the production hostname, and `?internal=1` marks Mavett's own browsers so his play is filtered out. The privacy page lists what the events contain.
**Why:** the launch needs answers page views can't give: which games people finish, where new players drop (how to play, the first board, a hint), whether daily players come back, and whether challenge links travel. Building events from the record, not from UI clicks, keeps one definition of a game and makes the schema testable without a browser.
**Gave up:** events for every tap (moves, cell fills), which would cost a lot of event volume for little insight and come close to sending answers; a user ID, which would need an account; and IP-based internal traffic rules, which break when the home IP changes.
### D-063 · Abort a board, and balance is 6×6 on every tier
**2026-11-17** · play screen header, balance expert
While a board or how to play is open, the play card's header shows "← abort", which returns to that game's start screen (a started board still counts as a quit after 5 seconds, as before). The × and every other way out also reset the game, so coming back to a game opens its start screen, not the board you left. Balance expert is now 6×6 like the other tiers: about 6 cells given, 3 to 5 links, and boards are regenerated until the rules alone can't finish them, so every expert board needs one step of lookahead. Par is 4 minutes.
**Why:** Next keeps a visited page alive when you navigate away, so leaving a board you couldn't solve and opening the game again brought the same board back, with no way out but home. Balance's rules (three of each per line) read best on 6×6, and the jump to 8×8 changed the game rather than the difficulty; sudoku already made the same choice (D-044).
**Gave up:** the 8×8 expert board, and expert difficulty from size.

### D-064 · Flags in trivia's higher or lower
**2026-11-17** · adds `public/flags/`, `scripts/build-flags.mjs`
Every choice in higher or lower shows a 4:3 flag beside the name: the country itself, or the city's country. Each item in `higher-lower.json` carries its ISO code. The flags come from flag-icons (MIT), rendered once to 240×180 WebPs of about 2 KB each (384 KB for all 188), served from the site, and the next question's pair is fetched while you answer. Mobile first: 56×42 on small phones, 64×48 from 380px, 80×60 from 640px, next to the name in the same card.
**Why:** two blocks of text is the plainest screen in the app. A flag makes the pair readable at a glance, and it's exact: no picture can be wrong about which country it shows. Bundling keeps it fast and private (no third-party image requests, nothing for the privacy page).
**Gave up:** photos of places (would need a live image service, per-photo credits and a privacy change, and a photo of "Brazil" is a guess), and pictures for the category questions, which are long text about albums, films and laws with no clean image per answer. The source SVGs, some over 100 KB.

### D-065 · A calmer type system, and Space Grotesk for numbers
**2026-11-17** · type tokens, `font-num`, every screen
Weights now carry meaning: 400 for body and big numbers, 500 for headings, names and buttons, 700 only for the wordmark and glyphs inside boards. The result score went from Geist Mono Bold to Space Grotesk Regular. Every standalone number (scores, ratings, bests, stat totals, clocks, countdowns) uses Space Grotesk through `font-num`, with tabular figures; numbers inside sentences, labels and boards stay mono. Mono tracking stops at -0.04em, uppercase labels get +0.07em, body line height is 1.6 and headings sit tighter (1.15 to 1.35).
**Why:** bold mono everywhere, squeezed tight, read as generic and loud: when everything is heavy nothing leads. Regular numerals at size look more confident, and a sans with some character (its 1, 2 and 7) gives the scores a voice of their own while the mono keeps the terminal identity for labels.
**Gave up:** the all-mono look, and bold as the default emphasis. Space Grotesk adds about 30 KB.

### D-066 · The footer is today's set
**2026-11-17** · replaces D-054's sign-off footer
The footer is a light band showing the daily set: how many are done and left, the countdown to the next set, a progress bar in each game's hue, and a tile per game that opens its daily. The slogan, the pitch line, the second game grid and the giant ghost wordmark are gone.
**Why:** the old footer stacked template parts that repeated the home page without doing a job. Progress on the daily set is useful at the end of any page, and the light background makes the end of the page unmistakable on a dark site.
**Gave up:** the "Built to bend minds." sign-off and the wordmark as decoration. Two other directions were tried (a terminal session log, and a board you draw on with the pointer).

### D-067 · Footer below the fold, and a splash that clears like a board
**2026-11-17** · `.page-fill`, `src/components/Splash.tsx`
Page content is now at least one large viewport tall (`100lvh`), so the light footer always starts below the fold, on short pages and on phones whose browser bars come and go. Its top corners take `--radius-card`. On the first page load of a session, a splash plays: the cursor types the wordmark, blinks, and the black screen breaks into board tiles that clear in a diagonal sweep. It is pure CSS, sent by the server so nothing flashes before it, about 3.3s and paced to feel deliberate (a blink before typing, a hesitation at the underscore, a slow sweep), with tiles sized to the screen (about 76px), skipped with reduced motion and on every later page in the session.
**Why:** a sliver of light footer under a short page read as a layout bug and pulled the eye away from the game, worst on phones. The splash introduces the two things the app is made of, the terminal cursor and the board, and the page appears the way a board clears, so it says something about the product instead of being a spinner.
**Gave up:** a splash on every navigation (it would get in the way), and JS-driven motion (it would stutter while the page hydrates).

### D-068 · A floating dock on phones
**2026-11-17** · `src/components/Dock.tsx`, `src/lib/dock.ts`
On phones a floating capsule holds today (with the daily set as a ring), games and stats, plus a white pill that opens your next unplayed daily, or practice once the set is done. It hides while a board is in play and returns on the result screen. Desktop keeps the header.
**Why:** on a phone the header is out of thumb reach and gives no sense of progress. The most common action, playing the next daily, now sits one tap away on every page, and the ring keeps the day's progress in view. The capsule uses the same raised surface and white primary pill as the rest of the app. Chosen over a classic tab bar with a centre key and a text-only terminal strip.
**Gave up:** a fifth tab for the streak (it stays in the header pill and on the stats page), and the dock on desktop.

### D-069 · Launch as 1.0
**2026-11-18** · `package.json`, `APP_VERSION`, GitHub releases
The public launch is version 1.0.0, not 0.8. The footer shows `v1.0` from one constant, and each release from here gets a git tag and a GitHub release whose notes come from the changelog. Semantic versioning: new games or modes are minor releases, fixes are patches.
**Why:** 0.x tells visitors the app isn't finished. Everything promised in the product brief ships at launch (eight games, daily sets, practice, challenge links, stats), so 1.0 is the honest number, and tagged releases give the repo a visible history.
**Gave up:** the 0.x numbering that matched the build phases.

### D-070 · The dock is navigation only, and hides on game pages
**2026-11-20** · `src/components/Dock.tsx`, `src/app/globals.css`
The phone dock (D-068) now holds three tabs, today, games and stats, and nothing else. The white "next daily" pill and the daily ring on the today tab are gone. The dock slides away on every game page, including the start screen and the result, and shows on home and stats. The active tab sits on a blob that morphs between tabs: its leading edge moves on a stiff spring and its trailing edge on a soft one, so it stretches toward where you tapped and settles, drawn from two caps and a scaled strip so only transforms animate. On the home page the active tab follows the scroll between the daily section and the games grid, and tapping today or games scrolls there instead of reloading the page.
**Why:** on a game's start screen the dock covered the play button, and its own pill was the brightest thing on screen while pointing at a different game (open balance from the daily set and it said "next: path"). A primary action that ignores what you're doing breaks trust in every other button. The home page, the start card and the result screen already lead you to the next daily, so the pill only repeated them where it was right and contradicted them where it wasn't. The ring read as a streak rather than progress and gave the dock a second job. A game page is a focused screen with a close button and one primary action, so the dock has nothing to add there. Two tabs that both led to the home page also looked broken when only one could ever be active; following the scroll makes both honest.
**Gave up:** one tap to the next daily from the stats page (one more tap through today), daily progress in the dock (it stays in the daily set and the footer), and the dock on the result screen.

### D-071 · Puzzle Rush: timed runs that ramp from mate in one
**2026-11-20** · `src/games/chess/rush.ts`, `src/games/chess/RushSession.tsx`, `src/components/GameStart.tsx`, `src/engine/history.ts`
chess gets a third mode, rush: 3 or 5 minutes to solve as many puzzles as you can, three wrong moves and the run ends, as on chess.com. Difficulty climbs with the puzzle number, not with your rating: five mates in one around 600 to 740, five mates in one or two up to 960, then any tactic, about +50 a puzzle to 1450, +40 to 2060, +30 to 2800, with the longest allowed line growing from one move to four. The sequence is seeded by the run, so a link replays the same puzzles with a score to beat. No hints, no rating, one history record per run with its score.
**Why:** practice and the daily are slow and deliberate; rush is the fast, replayable loop that makes chess.com's puzzles sticky. Opening on mates in one gets anyone scoring in the first seconds, the way chess.com does, and the length cap keeps early puzzles fast because the clock is the real opponent. Tying difficulty to the puzzle number instead of your rating makes scores comparable between players, which is what makes "beat my 21" a fair challenge and a good link to share. Keeping runs out of the puzzle rating stops a time-pressured blunder from costing rating earned slowly.
**Gave up:** rush scores moving your rating, hints, Puzzle Streak and survival modes for now, and puzzle variety across runs for the same seed (seen-before puzzles can come back in a new run; within a run they never repeat).

### D-072 · Reviewing a rush: replay every mistake, with hints and the solution
**2026-11-20** · `src/games/chess/RushReview.tsx`, `src/games/chess/RushSession.tsx`
Every puzzle on the rush end screen opens for review. When there were misses, "review 3 mistakes" is the primary action and walks through them in order: the puzzle replays from its setup move, off the clock, with unlimited tries, a two step hint, a solution that plays the line out, the move you played in the run, then next mistake. Reviewed misses are marked and the button counts down; once they're all seen, rush again takes the primary spot back. Reviews are never recorded.
**Why:** tactics are pattern recognition. A rush ends on the puzzles you couldn't see, and without the line those patterns stay invisible next run. Making review the primary action after a run with misses, while keeping rush again one tap away, puts learning first without blocking the replay loop. Showing your own move next to the right one makes the gap concrete. Wrong moves step back instead of failing the review, because the point is to find the line, not to be scored again.
**Gave up:** a third CTA on the first row (rush again and challenge share a row under review), the full "challenge a friend" label while mistakes are waiting (it reads "challenge"), and any record of reviews in history.

### D-073 · Game cards in their own colour, and the colour carries into the start screen
**2026-11-20** · `src/app/globals.css`, `src/components/GameTile.tsx`, `src/components/GameStart.tsx`, `src/lib/cardOpen.ts`, `src/app/play/[game]/page.tsx`
Each game gets a deep colour pair, a muted and darker take on its hue (OKLCH lightness about 0.48 to 0.27, chroma about 0.1). Home cards use it as a vertical gradient with one soft light in the top right corner and white text. Opening a card grows that colour from the tile to the screen and hands it to the start page, which keeps a wash at the top of the screen and a band across the top of the card behind the title. Text on colour has two levels only: white, and white at 86%.
**Why:** the grid of near-identical dark cards relied on small icon tiles and the art at the bottom to tell games apart; full colour makes each game recognisable at a glance. Muted, dark colours keep it calm next to the bright hues in the boards and icons, and they're what makes white text work: bright hues need black text. White passes 6:1 on every top stop and 86% white passes 5:1, so hierarchy comes from size, weight and the white pill instead of grey text. The light sits away from the text so it can't eat into contrast. Carrying the colour into the start screen makes the card feel like it opened rather than like a page load, and the band stops before the controls so the dark surfaces they were designed for are unchanged. The route changes only once the colour is opaque, so the old page never flashes through.
**Gave up:** the bright hues as card backgrounds (black text, louder grid), colour behind boards in play, a shared element morph of the card's content into the start card (the content swaps under the colour instead), a reverse animation on close, and the brighter ring the card shadow had on hover.
