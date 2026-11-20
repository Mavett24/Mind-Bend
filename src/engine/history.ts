/**
 * Score history: one record per game played, and everything else derived from it.
 * Pure TypeScript, no storage access (see src/lib/historyStore.ts for that).
 *
 * Why derive instead of storing totals: one source of truth can't drift, a new stat is a new
 * function rather than a migration, and imports from another device merge cleanly by record id.
 */
import { TIERS, TIER_RATING, suggestTier, type Tier } from "./difficulty";
import { START_RATING, updateRating } from "./rating";
import { applyPuzzle, PUZZLE_START_RATING } from "./puzzle-rating";
import type { Mode } from "./seed";

export interface GameRecord {
  id: string;
  /** Finish time, epoch ms. */
  at: number;
  gameId: string;
  tier: Tier;
  mode: Mode;
  seed: string;
  timeMs: number;
  solved: boolean;
  /** Left before finishing. Counted for completion rate, never for rating. */
  quit?: boolean;
  /** Scored games: 0 to 10. */
  points?: number;
  hints?: number;
  /** 0..1 result for rating. Absent on daily boards and quits, which don't move the rating. */
  outcome?: number;
  /**
   * Puzzle games (chess): the rating of the puzzle you faced. When set, the record is rated with
   * puzzle Elo (your rating against the puzzle's) instead of against the tier, and `outcome` only
   * marks that it was rated.
   */
  opponent?: number;
  /** Puzzle games: speed bonus earned on this solve, in rating points. */
  bonus?: number;
  /** Puzzle Rush runs (mode "rush"): puzzles solved in the run. */
  score?: number;
}

/** Progress from before history existed (v0.1 to v0.6 stored totals only). */
export interface Legacy {
  rating: number;
  played: number;
  solved: number;
  bestMs: Partial<Record<Tier, number>>;
  bestPoints: Partial<Record<Tier, number>>;
  dailyDone: string[];
}

export interface HistoryData {
  version: 2;
  records: GameRecord[];
  legacy: Record<string, Legacy>;
}

export const emptyHistory = (): HistoryData => ({ version: 2, records: [], legacy: {} });

export const dayKey = (at: number) => new Date(at).toISOString().slice(0, 10);

const DAY = 86_400_000;

/** Games whose daily is a set of several boards: the day counts as done once every one is played. */
export const DAILY_SIZE: Record<string, number> = { chess: 3 };

/** Games rated on the puzzle scale (puzzle Elo, wider range). Their ratings don't compare with the rest. */
export const PUZZLE_RATED = new Set(["chess"]);

/** Rating a new player starts from, per game. */
export const startRating = (gameId: string) => (PUZZLE_RATED.has(gameId) ? PUZZLE_START_RATING : START_RATING);

export type Scoring = "time" | "points";
/** Higher is better for points, lower is better for time. */
export const better = (scoring: Scoring, a: number, b: number) => (scoring === "points" ? a > b : a < b);
export const valueOf = (r: GameRecord, scoring: Scoring) => (scoring === "points" ? (r.points ?? 0) : r.timeMs);

// ---------------------------------------------------------------- per game

export interface RatingPoint {
  at: number;
  rating: number;
}

export interface GameSummary {
  gameId: string;
  played: number;
  solved: number;
  quits: number;
  rating: number;
  /** Rating after every rated game, oldest first. Starts with the baseline. */
  ratingSeries: RatingPoint[];
  best: Partial<Record<Tier, number>>;
  /** Solves per tier. */
  solvesByTier: Partial<Record<Tier, number>>;
  lastPlayed: number | null;
  dailyDone: Set<string>;
  hints: number;
  /** Highest rating ever reached. */
  peak: number;
  /** Rating change caused by each rated record, by record id. */
  deltas: Map<string, number>;
}

export function gameSummary(data: HistoryData, gameId: string, scoring: Scoring): GameSummary {
  const legacy = data.legacy[gameId];
  // Puzzle Rush runs have their own bests (rushBests) and never touch rating, solves or the daily (D-071).
  const records = data.records.filter((r) => r.gameId === gameId && r.mode !== "rush").sort((a, b) => a.at - b.at);
  let rating = legacy?.rating ?? startRating(gameId);
  let peak = rating;
  let ratedPuzzles = 0;
  const dailySize = DAILY_SIZE[gameId] ?? 1;
  const dailyPlays = new Map<string, number>();
  const ratingSeries: RatingPoint[] = [{ at: records[0]?.at ?? 0, rating }];
  const best: GameSummary["best"] = { ...(scoring === "points" ? legacy?.bestPoints : legacy?.bestMs) };
  const solvesByTier: GameSummary["solvesByTier"] = {};
  const dailyDone = new Set(legacy?.dailyDone ?? []);
  let solved = legacy?.solved ?? 0;
  let quits = 0;
  let hints = 0;
  const deltas = new Map<string, number>();

  for (const r of records) {
    if (r.quit) quits++;
    if (r.solved) {
      solved++;
      solvesByTier[r.tier] = (solvesByTier[r.tier] ?? 0) + 1;
      const v = valueOf(r, scoring);
      const prev = best[r.tier];
      if (prev === undefined || better(scoring, v, prev)) best[r.tier] = v;
      if (r.mode === "daily" && dailySize === 1) dailyDone.add(dayKey(r.at));
    }
    // A daily set counts once every board in it has been played, solved or not.
    if (r.mode === "daily" && dailySize > 1 && !r.quit) {
      const k = dayKey(r.at);
      const n = (dailyPlays.get(k) ?? 0) + 1;
      dailyPlays.set(k, n);
      if (n >= dailySize) dailyDone.add(k);
    }
    hints += r.hints ?? 0;
    if (r.outcome !== undefined) {
      const next =
        r.opponent !== undefined
          ? applyPuzzle(rating, { solved: r.solved, puzzleRating: r.opponent, hints: r.hints ?? 0, bonus: r.bonus ?? 0 }, ratedPuzzles++)
          : updateRating(rating, r.tier, r.outcome);
      deltas.set(r.id, next - rating);
      rating = next;
      peak = Math.max(peak, rating);
      ratingSeries.push({ at: r.at, rating });
    }
  }
  return {
    gameId,
    played: (legacy?.played ?? 0) + records.length,
    solved,
    quits,
    rating,
    ratingSeries,
    best,
    solvesByTier,
    lastPlayed: records.at(-1)?.at ?? null,
    dailyDone,
    hints,
    peak,
    deltas,
  };
}

/**
 * The 0..1 result a record feeds into the rating. Each hint costs 15%, down to 40% of the result,
 * so hints still help you finish but can't carry your rating up a tier.
 */
export function ratingOutcome(base: number, hints = 0): number {
  return base * Math.max(0.4, 1 - 0.15 * hints);
}

/** Solved results for one game and tier, oldest first. */
export function solvesAt(data: HistoryData, gameId: string, tier: Tier): GameRecord[] {
  return data.records.filter((r) => r.gameId === gameId && r.tier === tier && r.solved && r.mode !== "rush").sort((a, b) => a.at - b.at);
}

// ---------------------------------------------------------------- one result in context

export interface ResultInsight {
  /** 1 = best ever at this game and tier. */
  rank: number;
  /** Solves at this tier including this one. */
  of: number;
  newBest: boolean;
  previousBest: number | null;
  /** This result vs the average of the previous (up to) 10 at this tier, as a fraction. Positive = better. */
  vsRecent: number | null;
  ratingBefore: number;
  ratingAfter: number;
  /** The tier the new rating recommends, and whether it moved up. */
  suggested: Tier;
  promoted: boolean;
}

/** How a just-recorded result compares with everything before it. `data` must already contain `record`. */
export function insightFor(data: HistoryData, record: GameRecord, scoring: Scoring): ResultInsight {
  const solves = solvesAt(data, record.gameId, record.tier);
  const before = solves.filter((r) => r.id !== record.id);
  const v = valueOf(record, scoring);
  const values = before.map((r) => valueOf(r, scoring));
  const legacyBest = (scoring === "points" ? data.legacy[record.gameId]?.bestPoints : data.legacy[record.gameId]?.bestMs)?.[record.tier];
  const pool = legacyBest !== undefined ? [...values, legacyBest] : values;
  const previousBest = pool.length ? pool.reduce((a, b) => (better(scoring, a, b) ? a : b)) : null;
  const rank = 1 + pool.filter((x) => better(scoring, x, v)).length;
  const recent = values.slice(-10);
  const avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : null;
  const vsRecent = avg === null || avg === 0 ? null : scoring === "points" ? (v - avg) / avg : (avg - v) / avg;

  const withSummary = gameSummary(data, record.gameId, scoring);
  const without = gameSummary({ ...data, records: data.records.filter((r) => r.id !== record.id) }, record.gameId, scoring);
  const suggested = suggestTier(withSummary.rating);
  return {
    rank,
    of: pool.length + 1,
    newBest: record.solved && previousBest !== null && better(scoring, v, previousBest),
    previousBest,
    vsRecent,
    ratingBefore: without.rating,
    ratingAfter: withSummary.rating,
    suggested,
    promoted: TIERS.indexOf(suggested) > TIERS.indexOf(suggestTier(without.rating)),
  };
}

// ---------------------------------------------------------------- tier progression

export interface TierProgress {
  current: Tier;
  next: Tier | null;
  /** 0..1 progress from the current tier's threshold to the next one. */
  progress: number;
  /** Rating needed for the next tier to be suggested. */
  nextAt: number | null;
}

/** Ratings at which each tier becomes the suggestion (mirrors suggestTier's stretch of 100). */
export const TIER_THRESHOLD: Record<Tier, number> = {
  easy: 0,
  medium: TIER_RATING.medium - 100,
  hard: TIER_RATING.hard - 100,
  expert: TIER_RATING.expert - 100,
};

export function tierProgress(rating: number): TierProgress {
  const current = suggestTier(rating);
  const i = TIERS.indexOf(current);
  const next = TIERS[i + 1] ?? null;
  if (!next) return { current, next: null, progress: 1, nextAt: null };
  const from = i === 0 ? 400 : TIER_THRESHOLD[current];
  const to = TIER_THRESHOLD[next];
  return { current, next, progress: Math.min(1, Math.max(0, (rating - from) / (to - from))), nextAt: to };
}

export interface PuzzleBests {
  peak: number;
  /** Hardest puzzle solved without a hint. */
  hardest: number | null;
  /** Longest run of puzzles solved in a row. */
  bestRun: number;
  fastestMs: number | null;
}

/** Bests for puzzle-rated games, where "fastest per tier" means little. */
export function puzzleBests(data: HistoryData, gameId: string): PuzzleBests {
  const records = data.records.filter((r) => r.gameId === gameId && !r.quit && r.mode !== "rush").sort((a, b) => a.at - b.at);
  let run = 0;
  let bestRun = 0;
  let hardest: number | null = null;
  let fastestMs: number | null = null;
  for (const r of records) {
    run = r.solved ? run + 1 : 0;
    bestRun = Math.max(bestRun, run);
    if (r.solved && !r.hints && r.opponent !== undefined) hardest = Math.max(hardest ?? 0, r.opponent);
    if (r.solved && !r.hints) fastestMs = Math.min(fastestMs ?? Infinity, r.timeMs);
  }
  return { peak: gameSummary(data, gameId, "time").peak, hardest, bestRun, fastestMs };
}

/** What sits next to a rating in lists: the suggested tier, or the peak for puzzle-rated games. */
export function levelLabel(s: GameSummary): string {
  return PUZZLE_RATED.has(s.gameId) ? `peak ${s.peak}` : suggestTier(s.rating);
}

/** Progress bar and caption under a rating: towards the next tier, or the next 100 for puzzle-rated games. */
export function levelProgress(gameId: string, rating: number): { progress: number; caption: string | null } {
  if (PUZZLE_RATED.has(gameId)) {
    const to = Math.floor(rating / 100) * 100 + 100;
    return { progress: (rating % 100) / 100, caption: `${to - rating} to ${to}` };
  }
  const tp = tierProgress(rating);
  return { progress: tp.next ? tp.progress : 1, caption: tp.next ? `${tp.nextAt! - rating} to ${tp.next}` : null };
}

// ---------------------------------------------------------------- overall

export interface DayActivity {
  day: string;
  games: number;
}

export interface Overall {
  games: number;
  solved: number;
  timeMs: number;
  activeDays: Map<string, number>;
  /** Consecutive days with at least one game, ending today (or yesterday, so it isn't lost before you play). */
  streak: number;
  longestStreak: number;
  today: number;
}

export function overall(data: HistoryData, now: number): Overall {
  const activeDays = new Map<string, number>();
  let solved = 0;
  let timeMs = 0;
  for (const r of data.records) {
    const k = dayKey(r.at);
    activeDays.set(k, (activeDays.get(k) ?? 0) + 1);
    if (r.solved) solved++;
    timeMs += r.timeMs;
  }
  for (const l of Object.values(data.legacy)) {
    solved += l.solved;
    for (const d of l.dailyDone) if (!activeDays.has(d)) activeDays.set(d, 1);
  }
  const todayKey = dayKey(now);
  let day = activeDays.has(todayKey) ? now : now - DAY;
  let streak = 0;
  while (activeDays.has(dayKey(day))) {
    streak++;
    day -= DAY;
  }
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const k of [...activeDays.keys()].sort()) {
    const t = Date.parse(`${k}T00:00:00Z`);
    run = prev !== null && t - prev === DAY ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = t;
  }
  return {
    games: data.records.length + Object.values(data.legacy).reduce((n, l) => n + l.played, 0),
    solved,
    timeMs,
    activeDays,
    streak,
    longestStreak: longest,
    today: activeDays.get(todayKey) ?? 0,
  };
}

/** Games per day for the last `days` days, oldest first. */
export function activity(data: HistoryData, now: number, days: number): DayActivity[] {
  const counts = overall(data, now).activeDays;
  return Array.from({ length: days }, (_, i) => {
    const day = dayKey(now - (days - 1 - i) * DAY);
    return { day, games: counts.get(day) ?? 0 };
  });
}

// ---------------------------------------------------------------- skills and focus

export type Skill = "logic" | "words" | "memory" | "knowledge" | "tactics";

export const SKILL_OF: Record<string, Skill> = {
  path: "logic",
  balance: "logic",
  blocks: "logic",
  sudoku: "logic",
  weave: "words",
  recall: "memory",
  trivia: "knowledge",
  chess: "tactics",
};

export interface SkillScore {
  skill: Skill;
  rating: number;
  /** Games played in this skill. */
  played: number;
}

export function skills(summaries: GameSummary[]): SkillScore[] {
  const out: SkillScore[] = (["logic", "words", "memory", "knowledge", "tactics"] as Skill[]).map((skill) => {
    const own = summaries.filter((s) => SKILL_OF[s.gameId] === skill && s.played > 0);
    const rating = own.length ? Math.round(own.reduce((n, s) => n + s.rating, 0) / own.length) : skill === "tactics" ? PUZZLE_START_RATING : START_RATING;
    return { skill, rating, played: own.reduce((n, s) => n + s.played, 0) };
  });
  return out;
}

export interface Focus {
  gameId: string;
  reason: string;
}

/**
 * What to play next, so the scores steer training:
 * 1. a daily board not done today, if you've started the daily set
 * 2. a game you've never played
 * 3. your lowest-rated game, if it trails your average by 50+
 * 4. the game you haven't touched for longest
 */
export function focus(summaries: GameSummary[], names: Record<string, string>, now: number): Focus | null {
  if (summaries.length === 0) return null;
  const today = dayKey(now);
  const startedDaily = summaries.some((s) => s.dailyDone.has(today));
  const dailyLeft = summaries.find((s) => !s.dailyDone.has(today));
  if (startedDaily && dailyLeft) return { gameId: dailyLeft.gameId, reason: `Finish today's daily set: ${names[dailyLeft.gameId]} is next.` };
  const unplayed = summaries.find((s) => s.played === 0);
  if (unplayed) return { gameId: unplayed.gameId, reason: `You haven't tried ${names[unplayed.gameId]} yet.` };
  // Puzzle ratings sit on a different scale, so only compare games rated the same way.
  const comparable = summaries.filter((s) => !PUZZLE_RATED.has(s.gameId));
  const avg = comparable.reduce((n, s) => n + s.rating, 0) / Math.max(1, comparable.length);
  const weakest = [...comparable].sort((a, b) => a.rating - b.rating)[0];
  if (weakest && avg - weakest.rating >= 50) {
    return { gameId: weakest.gameId, reason: `${names[weakest.gameId]} is your lowest rating (${weakest.rating}). Close the gap.` };
  }
  const stale = [...summaries].sort((a, b) => (a.lastPlayed ?? 0) - (b.lastPlayed ?? 0))[0];
  const days = stale.lastPlayed ? Math.floor((now - stale.lastPlayed) / DAY) : null;
  return {
    gameId: stale.gameId,
    reason: days && days >= 2 ? `${days} days since your last ${names[stale.gameId]}. Keep it sharp.` : `Keep the variety going with ${names[stale.gameId]}.`,
  };
}

// ---------------------------------------------------------------- merge, export, import

export function merge(a: HistoryData, b: HistoryData): HistoryData {
  const byId = new Map(a.records.map((r) => [r.id, r]));
  for (const r of b.records) if (!byId.has(r.id)) byId.set(r.id, r);
  const legacy = { ...b.legacy, ...a.legacy };
  return { version: 2, records: [...byId.values()].sort((x, y) => x.at - y.at), legacy };
}

const isRecord = (x: unknown): x is GameRecord =>
  !!x &&
  typeof x === "object" &&
  typeof (x as GameRecord).id === "string" &&
  typeof (x as GameRecord).at === "number" &&
  typeof (x as GameRecord).gameId === "string" &&
  (TIERS as readonly string[]).includes((x as GameRecord).tier) &&
  typeof (x as GameRecord).timeMs === "number" &&
  typeof (x as GameRecord).solved === "boolean";

/** Accepts anything, returns a clean HistoryData or null. */
export function sanitize(raw: unknown): HistoryData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<HistoryData>;
  if (!Array.isArray(r.records)) return null;
  const records = r.records.filter(isRecord).map((x) => ({
    ...x,
    outcome: typeof x.outcome === "number" && x.outcome >= 0 && x.outcome <= 1 ? x.outcome : undefined,
    points: typeof x.points === "number" ? Math.min(10, Math.max(0, x.points)) : undefined,
    opponent: typeof x.opponent === "number" && x.opponent > 0 && x.opponent < 4000 ? x.opponent : undefined,
    bonus: typeof x.bonus === "number" ? Math.min(10, Math.max(0, Math.round(x.bonus))) : undefined,
    score: typeof x.score === "number" ? Math.min(999, Math.max(0, Math.round(x.score))) : undefined,
  }));
  const legacy: Record<string, Legacy> = {};
  if (r.legacy && typeof r.legacy === "object") {
    for (const [k, v] of Object.entries(r.legacy)) {
      if (v && typeof v === "object" && typeof (v as Legacy).rating === "number") {
        const l = v as Legacy;
        legacy[k] = {
          rating: l.rating,
          played: Number(l.played) || 0,
          solved: Number(l.solved) || 0,
          bestMs: l.bestMs ?? {},
          bestPoints: l.bestPoints ?? {},
          dailyDone: Array.isArray(l.dailyDone) ? l.dailyDone.filter((d) => typeof d === "string") : [],
        };
      }
    }
  }
  return { version: 2, records, legacy };
}

/** A copyable code: base64 of the JSON, prefixed so a paste can be recognised. */
export function exportCode(data: HistoryData): string {
  const json = JSON.stringify(data);
  const b64 = typeof btoa === "function" ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json, "utf8").toString("base64");
  return `MB2:${b64}`;
}

export function importCode(code: string): HistoryData | null {
  const trimmed = code.trim();
  try {
    if (trimmed.startsWith("{")) return sanitize(JSON.parse(trimmed));
    if (!trimmed.startsWith("MB2:")) return null;
    const b64 = trimmed.slice(4);
    const json = typeof atob === "function" ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, "base64").toString("utf8");
    return sanitize(JSON.parse(json));
  } catch {
    return null;
  }
}
