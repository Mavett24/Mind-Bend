/**
 * Puzzle Elo, the chess.com way: your rating plays the puzzle's rating. Used by chess, where every
 * puzzle carries its own rating from the Lichess database. Pure, derived from history like every
 * other rating (see history.ts).
 */

export const PUZZLE_START_RATING = 1200;
const MIN_RATING = 100;
const MAX_RATING = 3300;

/** Provisional K: big swings for your first puzzles so you find your level fast, then steadier. */
export function puzzleK(ratedSoFar: number): number {
  if (ratedSoFar < 10) return 64;
  if (ratedSoFar < 30) return 40;
  return 24;
}

/** Share of the win kept after hints: the piece hint halves it, seeing the move keeps none. Hints never cost rating on their own. */
export function hintFactor(hints: number): number {
  if (hints <= 0) return 1;
  if (hints === 1) return 0.5;
  return 0;
}

export const expectedScore = (rating: number, puzzleRating: number) => 1 / (1 + 10 ** ((puzzleRating - rating) / 400));

export interface PuzzleResult {
  solved: boolean;
  puzzleRating: number;
  hints: number;
  /** Speed bonus earned on this solve (0 with hints or a fail). */
  bonus: number;
}

/** Rating change for one rated puzzle. A clean solve always gains at least 1. */
export function puzzleDelta(rating: number, r: PuzzleResult, ratedSoFar: number): number {
  const k = puzzleK(ratedSoFar);
  const e = expectedScore(rating, r.puzzleRating);
  if (!r.solved) return -Math.round(k * e);
  const f = hintFactor(r.hints);
  const gain = Math.round(k * (1 - e) * f);
  return (f === 1 ? Math.max(1, gain) : gain) + (r.hints ? 0 : r.bonus);
}

export function applyPuzzle(rating: number, r: PuzzleResult, ratedSoFar: number): number {
  return Math.min(MAX_RATING, Math.max(MIN_RATING, rating + puzzleDelta(rating, r, ratedSoFar)));
}
