/**
 * Scoring bands and the points-to-outcome mapping. Totals, bests, streaks and ratings are derived
 * from the game history in history.ts (the stored totals this file used to keep were retired in v0.7).
 */

/** high, mid or low: picks the score line. Time: at or under par, up to 2x, slower. Points: 8+, 5+, below. */
export type Band = "high" | "mid" | "low";

export function timeBand(timeMs: number, parMs: number): Band {
  if (timeMs <= parMs) return "high";
  if (timeMs <= parMs * 2) return "mid";
  return "low";
}

export function pointsBand(points: number): Band {
  if (points >= 8) return "high";
  if (points >= 5) return "mid";
  return "low";
}

/** Points to a 0..1 result: 4/10 or less counts as a loss, 9/10 or more as a full win, linear between. */
export function pointsOutcome(points: number): number {
  return Math.min(1, Math.max(0, (points - 4) / 5));
}
