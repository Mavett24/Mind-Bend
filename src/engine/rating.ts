import { TIER_RATING, type Tier } from "./difficulty";

export const START_RATING = 1000;
const K = 32;
const MIN_RATING = 400;
const MAX_RATING = 2400;

/**
 * Outcome of one game, mapped to 0..1 like a chess result.
 * Solved at or under par time scores 1. Slower solves fade towards 0.5.
 * A failed or abandoned game scores 0.
 */
export function outcomeScore(solved: boolean, timeMs: number, parMs: number): number {
  if (!solved) return 0;
  if (timeMs <= parMs) return 1;
  const overRatio = Math.min(timeMs / parMs, 3); // cap at 3x par
  return 1 - ((overRatio - 1) / 2) * 0.5; // 1x par -> 1, 3x par -> 0.5
}

/** Elo update against the tier's nominal rating. */
export function updateRating(rating: number, tier: Tier, outcome: number): number {
  const opponent = TIER_RATING[tier];
  const expected = 1 / (1 + 10 ** ((opponent - rating) / 400));
  const next = rating + K * (outcome - expected);
  return Math.round(Math.min(MAX_RATING, Math.max(MIN_RATING, next)));
}
