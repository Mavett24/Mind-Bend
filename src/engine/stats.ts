import { outcomeScore, START_RATING, updateRating } from "./rating";
import type { Mode } from "./seed";
import { TIERS, type Tier } from "./difficulty";
import { readJson, writeJson } from "./storage";

export interface GameStats {
  played: number;
  solved: number;
  rating: number;
  /** Fastest solve per tier, for timed games. */
  bestMs: Partial<Record<Tier, number>>;
  /** Highest score (0 to 10) per tier, for scored games like recall. */
  bestPoints: Partial<Record<Tier, number>>;
  /** UTC date keys of completed daily boards, most recent last. Capped at 60. */
  dailyDone: string[];
}

export function emptyStats(): GameStats {
  return { played: 0, solved: 0, rating: START_RATING, bestMs: {}, bestPoints: {}, dailyDone: [] };
}

function sanitize(raw: Partial<GameStats> | null): GameStats {
  const base = emptyStats();
  if (!raw || typeof raw !== "object") return base;
  const bestMs: GameStats["bestMs"] = {};
  const bestPoints: GameStats["bestPoints"] = {};
  for (const tier of TIERS) {
    const v = raw.bestMs?.[tier];
    if (typeof v === "number" && v > 0) bestMs[tier] = v;
    const p = raw.bestPoints?.[tier];
    if (typeof p === "number" && p >= 0 && p <= 10) bestPoints[tier] = p;
  }
  return {
    played: Number.isFinite(raw.played) ? Number(raw.played) : base.played,
    solved: Number.isFinite(raw.solved) ? Number(raw.solved) : base.solved,
    rating: Number.isFinite(raw.rating) ? Number(raw.rating) : base.rating,
    bestMs,
    bestPoints,
    dailyDone: Array.isArray(raw.dailyDone) ? raw.dailyDone.filter((d) => typeof d === "string").slice(-60) : [],
  };
}

export function loadStats(gameId: string): GameStats {
  return sanitize(readJson<Partial<GameStats> | null>(`stats:${gameId}`, null));
}

export function saveStats(gameId: string, stats: GameStats): void {
  writeJson(`stats:${gameId}`, stats);
}

/** Consecutive UTC days ending today (or yesterday, so a streak isn't lost before today's board). */
export function dailyStreak(dailyDone: readonly string[], todayKey: string): number {
  const done = new Set(dailyDone);
  const day = new Date(`${todayKey}T00:00:00Z`);
  if (!done.has(todayKey)) day.setUTCDate(day.getUTCDate() - 1);
  let streak = 0;
  while (done.has(day.toISOString().slice(0, 10))) {
    streak++;
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return streak;
}

// ---------------------------------------------------------------- recording a finished game

export interface GameResult {
  tier: Tier;
  mode: Mode;
  timeMs: number;
  solved: boolean;
  /** Scored games only: 0 to 10. When present, it decides the band, best and rating instead of time. */
  points?: number;
  /** UTC date key, required for daily results. */
  dateKey?: string;
}

/** high, mid or low: picks the score line. Time: at or under par, up to 2x, slower. Points: 8+, 5+, below. */
export type Band = "high" | "mid" | "low";

export interface ResultSummary {
  stats: GameStats;
  ratingDelta: number;
  newBest: boolean;
  band: Band;
}

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

/**
 * Pure: returns the updated stats. Daily boards count towards streak and bests
 * but not rating, so everyone's shared board can't be farmed for points.
 */
export function applyResult(prev: GameStats, result: GameResult, parMs: number): ResultSummary {
  const stats: GameStats = {
    ...prev,
    bestMs: { ...prev.bestMs },
    bestPoints: { ...prev.bestPoints },
    dailyDone: prev.dailyDone.slice(),
  };
  const scored = result.points !== undefined;
  stats.played++;
  let newBest = false;
  if (result.solved) {
    stats.solved++;
    if (scored) {
      const best = stats.bestPoints[result.tier];
      if (best === undefined || result.points! > best) {
        newBest = best !== undefined;
        stats.bestPoints[result.tier] = result.points!;
      }
    } else {
      const best = stats.bestMs[result.tier];
      if (best === undefined || result.timeMs < best) {
        newBest = best !== undefined;
        stats.bestMs[result.tier] = result.timeMs;
      }
    }
  }
  let ratingDelta = 0;
  if (result.mode !== "daily") {
    const outcome = scored ? pointsOutcome(result.points!) : outcomeScore(result.solved, result.timeMs, parMs);
    const next = updateRating(stats.rating, result.tier, outcome);
    ratingDelta = next - stats.rating;
    stats.rating = next;
  } else if (result.solved && result.dateKey && !stats.dailyDone.includes(result.dateKey)) {
    stats.dailyDone = [...stats.dailyDone, result.dateKey].slice(-60);
  }
  return { stats, ratingDelta, newBest, band: scored ? pointsBand(result.points!) : timeBand(result.timeMs, parMs) };
}
