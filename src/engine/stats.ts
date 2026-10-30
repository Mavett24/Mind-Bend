import { outcomeScore, START_RATING, updateRating } from "./rating";
import type { Mode } from "./seed";
import { TIERS, type Tier } from "./difficulty";
import { readJson, writeJson } from "./storage";

export interface GameStats {
  played: number;
  solved: number;
  rating: number;
  bestMs: Partial<Record<Tier, number>>;
  /** UTC date keys of completed daily boards, most recent last. Capped at 60. */
  dailyDone: string[];
}

export function emptyStats(): GameStats {
  return { played: 0, solved: 0, rating: START_RATING, bestMs: {}, dailyDone: [] };
}

function sanitize(raw: Partial<GameStats> | null): GameStats {
  const base = emptyStats();
  if (!raw || typeof raw !== "object") return base;
  const bestMs: GameStats["bestMs"] = {};
  for (const tier of TIERS) {
    const v = raw.bestMs?.[tier];
    if (typeof v === "number" && v > 0) bestMs[tier] = v;
  }
  return {
    played: Number.isFinite(raw.played) ? Number(raw.played) : base.played,
    solved: Number.isFinite(raw.solved) ? Number(raw.solved) : base.solved,
    rating: Number.isFinite(raw.rating) ? Number(raw.rating) : base.rating,
    bestMs,
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
  /** UTC date key, required for daily results. */
  dateKey?: string;
}

export interface ResultSummary {
  stats: GameStats;
  ratingDelta: number;
  newBest: boolean;
  /** Time relative to par: fast (at or under par), average (up to 2x), slow. */
  band: "fast" | "average" | "slow";
}

export function scoreBand(timeMs: number, parMs: number): ResultSummary["band"] {
  if (timeMs <= parMs) return "fast";
  if (timeMs <= parMs * 2) return "average";
  return "slow";
}

/**
 * Pure: returns the updated stats. Daily boards count towards streak and bests
 * but not rating, so everyone's shared board can't be farmed for points.
 */
export function applyResult(prev: GameStats, result: GameResult, parMs: number): ResultSummary {
  const stats: GameStats = { ...prev, bestMs: { ...prev.bestMs }, dailyDone: prev.dailyDone.slice() };
  stats.played++;
  let newBest = false;
  if (result.solved) {
    stats.solved++;
    const best = stats.bestMs[result.tier];
    if (best === undefined || result.timeMs < best) {
      newBest = best !== undefined;
      stats.bestMs[result.tier] = result.timeMs;
    }
  }
  let ratingDelta = 0;
  if (result.mode !== "daily") {
    const next = updateRating(stats.rating, result.tier, outcomeScore(result.solved, result.timeMs, parMs));
    ratingDelta = next - stats.rating;
    stats.rating = next;
  } else if (result.solved && result.dateKey && !stats.dailyDone.includes(result.dateKey)) {
    stats.dailyDone = [...stats.dailyDone, result.dateKey].slice(-60);
  }
  return { stats, ratingDelta, newBest, band: scoreBand(result.timeMs, parMs) };
}
