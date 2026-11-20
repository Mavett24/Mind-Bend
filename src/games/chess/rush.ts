/**
 * Puzzle Rush: solve as many puzzles as you can before the clock runs out, three mistakes and the
 * run ends (D-071). Modelled on chess.com's Puzzle Rush.
 *
 * Pure: the ramp, picking the puzzle for each step and the bests. The sequence depends only on
 * the run's seed and the step, never on how you're doing, so a shared link replays the same run.
 */
import type { Rng } from "@/engine/rng";
import type { GameRecord, HistoryData } from "@/engine/history";
import { playerMoves, type ChessPuzzle } from "./engine";

export const RUSH_MINUTES = [3, 5] as const;
export type RushMinutes = (typeof RUSH_MINUTES)[number];
export const isRushMinutes = (x: unknown): x is RushMinutes => x === 3 || x === 5 || x === "3" || x === "5";

export const RUSH_STRIKES = 3;

export interface RushStep {
  /** Puzzle rating to aim for. */
  target: number;
  /** Longest line allowed, in player moves. Short lines early: the clock is the opponent. */
  maxMoves: number;
  /** Only puzzles carrying one of these themes, when set. */
  themes?: readonly string[];
}

/**
 * The ramp, by puzzle number (0-based):
 * - 1 to 5: mate in 1 from the bottom of the set (600 to 740), back rank mates among them.
 * - 6 to 10: mate in 1 or 2 (760 to 960).
 * - 11 to 20: any tactic, two moves at most, 1000 to 1450.
 * - 21 to 35: three moves at most, 1500 to 2060.
 * - 36 on: four moves at most, climbing 30 a puzzle to the top of the set (2800).
 */
export function rushStep(i: number): RushStep {
  if (i < 5) return { target: 600 + i * 35, maxMoves: 1, themes: ["mateIn1"] };
  if (i < 10) return { target: 760 + (i - 5) * 50, maxMoves: 2, themes: ["mateIn1", "mateIn2"] };
  if (i < 20) return { target: 1000 + (i - 10) * 50, maxMoves: 2 };
  if (i < 35) return { target: 1500 + (i - 20) * 40, maxMoves: 3 };
  return { target: Math.min(2800, 2100 + (i - 35) * 30), maxMoves: 4 };
}

const fits = (p: ChessPuzzle, step: RushStep) =>
  playerMoves(p) <= step.maxMoves && (!step.themes || step.themes.some((t) => p.themes.includes(t)));

/**
 * The puzzle for one step: among unused puzzles that fit the step, one of the closest to its target.
 * If too few fit (the ends of the set), the rules loosen in order: wider rating, then any theme,
 * then any length, so a run never stalls.
 */
export function pickRushPuzzle(pool: readonly ChessPuzzle[], step: RushStep, rng: Rng, used: ReadonlySet<string>): ChessPuzzle {
  const fresh = pool.filter((p) => !used.has(p.id));
  const from = fresh.length ? fresh : pool;
  if (from.length === 0) throw new RangeError("pickRushPuzzle() on an empty pool");
  const attempts: ((p: ChessPuzzle) => boolean)[] = [
    (p) => fits(p, step) && Math.abs(p.rating - step.target) <= 80,
    (p) => fits(p, step) && Math.abs(p.rating - step.target) <= 160,
    (p) => playerMoves(p) <= step.maxMoves && Math.abs(p.rating - step.target) <= 160,
    () => true,
  ];
  for (const ok of attempts) {
    const candidates = from.filter(ok);
    if (candidates.length >= 6 || (ok === attempts[attempts.length - 1] && candidates.length)) {
      const near = [...candidates].sort((a, b) => Math.abs(a.rating - step.target) - Math.abs(b.rating - step.target) || (a.id < b.id ? -1 : 1)).slice(0, 24);
      return rng.pick(near);
    }
  }
  return from[0];
}

/** A rush record's seed: `rush<minutes>-<seed>`, e.g. rush3-k3f9x2. */
export const rushSeed = (minutes: RushMinutes, seed: string) => `rush${minutes}-${seed}`;

export function parseRushSeed(s: string): { minutes: RushMinutes; seed: string } | null {
  const m = /^rush([35])-([A-Za-z0-9]{1,24})$/.exec(s);
  return m ? { minutes: Number(m[1]) as RushMinutes, seed: m[2] } : null;
}

export interface RushBests {
  /** Best score per length, null if never played. */
  best: Record<RushMinutes, number | null>;
  runs: number;
}

/** Best scores per length. Quits don't count. */
export function rushBests(data: HistoryData): RushBests {
  const best: Record<RushMinutes, number | null> = { 3: null, 5: null };
  let runs = 0;
  for (const r of data.records) {
    if (!isRushRecord(r) || r.quit) continue;
    const parsed = parseRushSeed(r.seed);
    if (!parsed) continue;
    runs++;
    const score = r.score ?? 0;
    best[parsed.minutes] = Math.max(best[parsed.minutes] ?? 0, score);
  }
  return { best, runs };
}

export const isRushRecord = (r: GameRecord) => r.mode === "rush";
