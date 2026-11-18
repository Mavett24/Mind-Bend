/**
 * The GA4 event schema (D-062, spec in docs/ANALYTICS.md). Pure: builds events, never sends them.
 * src/lib/track.ts sends them, and only after the visitor has accepted analytics.
 *
 * One finished or abandoned game is one history record, and its events are built from that
 * record, so GA counts games exactly the way the stats page does.
 */
import { TIERS, suggestTier, type Tier } from "@/engine/difficulty";
import { dayKey, gameSummary, type GameRecord, type HistoryData, type Scoring } from "@/engine/history";
import type { Mode } from "@/engine/seed";
import { GAMES } from "@/games/registry";

export type EventParams = Record<string, string | number>;
export interface AnalyticsEvent {
  name: string;
  params: EventParams;
}

/** Which board is being played. Every game event carries these three. */
export interface PlayContext {
  game: string;
  tier: Tier;
  mode: Mode;
}

/** How a game ended without a result: leaving the board in the app, or closing or reloading the page. */
export type ExitKind = "left_board" | "page_close";

/** Games whose levels come from the shared tier ladder. chess tiers are offsets from your rating, so it has no level ups. */
const LADDER_SCORING = new Set<string>(GAMES.filter((g) => g.id !== "chess").map((g) => g.id));

const seconds = (ms: number) => Math.round(ms / 100) / 10;

const base = (ctx: PlayContext): EventParams => ({ game: ctx.game, tier: ctx.tier, mode: ctx.mode });

/** The board is on screen and the clock is running. */
export function gameStart(ctx: PlayContext, opts: { retry?: boolean } = {}): AnalyticsEvent {
  return { name: "game_start", params: { ...base(ctx), retry: opts.retry ? "yes" : "no" } };
}

/** Left a board in progress, without a result. */
export function gameAbandon(ctx: PlayContext, timeMs: number, exit: ExitKind): AnalyticsEvent {
  return { name: "game_abandon", params: { ...base(ctx), duration_s: seconds(timeMs), exit } };
}

/**
 * Events for a record just added to the history. `before` is the history without it, `after` with it.
 * Returns game_complete or game_abandon, plus level_up, first_game_complete and daily_set_complete when they apply.
 */
export function recordEvents(record: GameRecord, before: HistoryData, after: HistoryData, scoringOf: (gameId: string) => Scoring): AnalyticsEvent[] {
  const ctx: PlayContext = { game: record.gameId, tier: record.tier, mode: record.mode };
  if (record.quit) return [gameAbandon(ctx, record.timeMs, "left_board")];

  const scoring = scoringOf(record.gameId);
  const was = gameSummary(before, record.gameId, scoring);
  const now = gameSummary(after, record.gameId, scoring);
  const rated = record.outcome !== undefined;

  const params: EventParams = {
    ...base(ctx),
    result: record.solved ? "solved" : "failed",
    duration_s: seconds(record.timeMs),
    hints: record.hints ?? 0,
    rated: rated ? "yes" : "no",
    rating: Math.round(now.rating),
  };
  if (record.points !== undefined) params.points = record.points;
  if (rated) params.rating_change = Math.round(now.rating - was.rating);
  if (record.opponent !== undefined) params.puzzle_rating = record.opponent;

  const events: AnalyticsEvent[] = [{ name: "game_complete", params }];

  if (rated && LADDER_SCORING.has(record.gameId)) {
    const from = suggestTier(was.rating);
    const to = suggestTier(now.rating);
    if (TIERS.indexOf(to) > TIERS.indexOf(from)) {
      // GA4 recommended level_up: `level` is a number (1 easy to 4 expert), the tier name rides along.
      events.push({ name: "level_up", params: { level: TIERS.indexOf(to) + 1, character: record.gameId, game: record.gameId, tier: to } });
    }
  }

  if (hasNoGames(before)) events.push({ name: "first_game_complete", params: { ...base(ctx) } });

  if (record.mode === "daily") {
    const day = dayKey(record.at);
    const doneBefore = dailyCount(before, day, scoringOf);
    const doneAfter = dailyCount(after, day, scoringOf);
    if (doneBefore < GAMES.length && doneAfter === GAMES.length) {
      events.push({ name: "daily_set_complete", params: { games: GAMES.length, last_game: record.gameId } });
    }
  }
  return events;
}

/**
 * chess attempts that never become a history record: a retry of a failed puzzle, or a puzzle you
 * have already seen. Sent so every game_start with retry "yes" has an ending.
 */
export function unrecordedComplete(ctx: PlayContext, a: { solved: boolean; timeMs: number; hints: number; puzzleRating?: number }): AnalyticsEvent {
  const params: EventParams = {
    ...base(ctx),
    result: a.solved ? "solved" : "failed",
    duration_s: seconds(a.timeMs),
    hints: a.hints,
    rated: "no",
    retry: "yes",
  };
  if (a.puzzleRating !== undefined) params.puzzle_rating = a.puzzleRating;
  return { name: "game_complete", params };
}

/** A hint was given. `number` counts hints on this board, starting at 1 (chess: 1 = piece, 2 = move). */
export function hintUsed(ctx: PlayContext, number: number): AnalyticsEvent {
  return { name: "hint_used", params: { ...base(ctx), hint_number: number } };
}

/** A challenge link was copied (GA4 recommended `share` event). */
export function shareChallenge(game: string, method: "clipboard" | "prompt"): AnalyticsEvent {
  return { name: "share", params: { method, content_type: "challenge_link", item_id: game, game } };
}

/** How to play: shown (begin) and left by pressing start (complete). GA4 recommended tutorial events. */
export function tutorial(game: string, step: "begin" | "complete"): AnalyticsEvent {
  return { name: step === "begin" ? "tutorial_begin" : "tutorial_complete", params: { game } };
}

function hasNoGames(data: HistoryData): boolean {
  return data.records.every((r) => r.quit) && Object.keys(data.legacy).length === 0;
}

function dailyCount(data: HistoryData, day: string, scoringOf: (gameId: string) => Scoring): number {
  return GAMES.filter((g) => gameSummary(data, g.id, scoringOf(g.id)).dailyDone.has(day)).length;
}
