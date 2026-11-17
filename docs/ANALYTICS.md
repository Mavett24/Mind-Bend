# Analytics

How Mind Bend measures play with Google Analytics 4, and how the GA property is set up. Decisions: D-053 (consent), D-062 (events).

## Rules

- Nothing is sent before the visitor accepts the cookie card. Rejecting sends nothing, ever.
- GA only loads in Production (`NEXT_PUBLIC_GA_ID`) and only on the production hostname (`SITE_URL` in `src/lib/site.ts`). Preview, branch and localhost URLs never send data.
- One finished or abandoned game is one history record, and its events are built from that record (`recordGame` in `src/lib/track.ts`). GA counts games exactly the way the stats page does.
- Events never carry seeds, board contents, moves or answers. No personal data, no user ID.
- Event builders are pure and tested (`src/lib/events.ts`, `events.test.ts`). Sending is `sendEvents` in `src/lib/analytics.ts`.

## Events

| Event | When | Parameters |
|---|---|---|
| `game_start` | The board is ready and the clock starts. chess: each puzzle, and each retry. | game, tier, mode, retry |
| `game_complete` | A game ends with a result. Logic games: solved. recall and trivia: all rounds done. chess: solved or a wrong move. | game, tier, mode, result, duration_s, hints, rated, rating, rating_change (rated only), points (recall, trivia), puzzle_rating (chess), retry (chess retries only) |
| `game_abandon` | Left a started board after 5 seconds or more without a result. | game, tier, mode, duration_s, exit |
| `level_up` | A rated result moves the suggested tier up. Never for chess. GA4 recommended event. | level (1 to 4), character (game), game, tier |
| `first_game_complete` | The first game this browser ever finishes. | game, tier, mode |
| `daily_set_complete` | The game that completes all eight daily boards for the day. Once per day. | games, last_game |
| `hint_used` | A hint is given. | game, tier, mode, hint_number (chess: 1 piece, 2 move) |
| `share` | A challenge link is copied (or shown to copy by hand). GA4 recommended event. | method (clipboard, prompt), content_type (challenge_link), item_id (game), game |
| `tutorial_begin` | How to play is shown. GA4 recommended event. | game |
| `tutorial_complete` | Start is pressed on how to play. GA4 recommended event. | game |

Page views come from GA's enhanced measurement (history changes on), not from code.

**Parameter values**

- game: path, balance, blocks, sudoku, weave, recall, trivia, chess
- tier: easy, medium, hard, expert. mode: daily, practice, challenge
- result: solved, failed. exit: left_board (left in the app), page_close (closed or reloaded the tab; GA only, the history doesn't see it)
- rated, retry: yes, no
- duration_s: seconds, one decimal. rating: the game's rating after this result. rating_change: whole points

## Flags for testing

- `?internal=1` on any page marks this browser as internal for good (sends `traffic_type: internal`). `?internal=0` undoes it. Open the site once with it on every device you play on.
- `?ga_debug=1` sends `debug_mode` for this tab, so events show in Admin, DebugView.

## GA4 property setup

Do this before launch: custom dimensions and metrics only apply from the day they are registered, never to older data.

**Data settings**
1. Data retention: 14 months (the privacy page promises it).
2. Data filters: set **Internal Traffic** to Active (it matches `traffic_type = internal`). Add a **Developer traffic** filter and set it Active, so DebugView sessions stay out of reports.
3. Data stream, enhanced measurement: page views and "page changes based on browser history events" on. Turn off site search, form interactions and video, which Mind Bend doesn't have.
4. Data stream, configure tag settings, list unwanted referrals: none needed. Cross-domain: not needed until a custom domain lands.

**Custom dimensions** (event scope): game, tier, mode, result, exit, rated, retry.

**Custom metrics** (event scope, standard unless noted): duration_s (unit: seconds), hints, points, rating, rating_change, puzzle_rating, hint_number.

**Key events:** first_game_complete (activation), daily_set_complete (habit), share (growth).

**Audiences**
- Players: game_start at least once.
- Finishers: first_game_complete.
- Daily regulars: daily_set_complete in the last 7 days.
- Sharers: share at least once.
- Stuck: game_abandon at least 3 times and no game_complete in the last 7 days.

**Explorations**
1. Funnel (open, by game): session_start, tutorial_begin, game_start, game_complete. Shows where new players drop.
2. Game table (free form): rows game, columns tier; values event count filtered to game_start, game_complete and game_abandon, plus average duration_s. Completion rate is complete divided by start.
3. Retention (cohort): first_game_complete, then game_start, weekly.
4. Path from game_complete: what players do after a result (next board, share, leave).
5. Hints: hint_used by game and hint_number, against result on game_complete.

**Reports:** add a "Games" collection under Reports, Library, with a detail report of events filtered to the game events and the game dimension as primary. A Looker Studio dashboard can sit on top later.

## Checking it works

1. Deploy, open `https://mind-bend.vercel.app/?internal=1&ga_debug=1`, accept.
2. Play a board, take a hint, copy a challenge link, leave another board after 5 seconds.
3. Admin, DebugView: each event appears within seconds with its parameters.
4. Realtime and standard reports exclude this traffic once the internal filter is Active. Standard reports fill in after 24 to 48 hours.
