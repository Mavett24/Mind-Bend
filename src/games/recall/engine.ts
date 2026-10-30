/**
 * recall: hold several colours at once, each tied to a position, then rebuild the one asked for.
 * Pure TypeScript. See docs/games/recall.md.
 */
import { createRng, type Rng } from "@/engine/rng";
import { boardSeed, type BoardKey } from "@/engine/seed";
import type { Tier } from "@/engine/difficulty";
import { colourDistance, inGamut, type Oklch } from "./color";

export const ROUNDS = 5;

export interface Round {
  /** Colour per tile position. Layout depends on tile count (1 = full, 2 = stacked, 3 = bands, 4 = 2×2). */
  tiles: Oklch[];
  /** Tile indices to rebuild, in order. */
  targets: number[];
  /** Where each picker starts, one per target. */
  starts: Oklch[];
}

export interface RecallPuzzle {
  tier: Tier;
  displayMs: number;
  rounds: Round[];
}

interface TierConfig {
  tiles: number;
  displayMs: number;
  recalled: number;
}

const CONFIG: Record<Tier, TierConfig> = {
  easy: { tiles: 1, displayMs: 5000, recalled: 1 },
  medium: { tiles: 2, displayMs: 4000, recalled: 1 },
  hard: { tiles: 3, displayMs: 3000, recalled: 1 },
  expert: { tiles: 4, displayMs: 3000, recalled: 2 },
};

/** Recall is scored, not timed. Par is unused but required by the module contract. */
export const RECALL_PAR_MS: Record<Tier, number> = { easy: 0, medium: 0, hard: 0, expert: 0 };

/** Picker ranges, shared with the UI. Targets sit well inside them so nothing is at an edge. */
export const PICKER = { l: [0.25, 0.95], c: [0, 0.25], h: [0, 360] } as const;

const TARGET = { l: [0.45, 0.85], c: [0.05, 0.2] } as const;
const MIN_SEPARATION = 20; // ΔE00 between tiles in one round

function sampleColour(rng: Rng): Oklch {
  for (;;) {
    const colour = {
      l: TARGET.l[0] + rng.next() * (TARGET.l[1] - TARGET.l[0]),
      c: TARGET.c[0] + rng.next() * (TARGET.c[1] - TARGET.c[0]),
      h: rng.next() * 360,
    };
    if (inGamut(colour)) return colour;
  }
}

export function generateRecall(key: BoardKey): RecallPuzzle {
  const cfg = CONFIG[key.tier];
  const rng = createRng(boardSeed(key));
  const rounds: Round[] = [];
  for (let r = 0; r < ROUNDS; r++) {
    const roundRng = rng.fork(`round-${r}`);
    const tiles: Oklch[] = [];
    for (let guard = 0; tiles.length < cfg.tiles && guard < 500; guard++) {
      const candidate = sampleColour(roundRng);
      if (tiles.every((t) => colourDistance(t, candidate) >= MIN_SEPARATION)) tiles.push(candidate);
    }
    while (tiles.length < cfg.tiles) tiles.push(sampleColour(roundRng)); // practically unreachable
    const targets = roundRng.shuffle(tiles.map((_, i) => i)).slice(0, cfg.recalled);
    const starts = targets.map(() => ({ l: 0.65, c: 0.08, h: roundRng.next() * 360 }));
    rounds.push({ tiles, targets, starts });
  }
  return { tier: key.tier, displayMs: cfg.displayMs, rounds };
}

/**
 * ΔE00 to a 0..10 score. 0 is a perfect match, 40 or more scores 0.
 * The curve is gentle near zero so near-misses still feel rewarded.
 */
export function accuracy(deltaE: number): number {
  if (deltaE >= 40) return 0;
  return Math.round(10 * (1 - deltaE / 40) ** 1.2 * 100) / 100;
}

export function scoreGuess(target: Oklch, guess: Oklch): { deltaE: number; points: number } {
  const deltaE = colourDistance(target, guess);
  return { deltaE, points: accuracy(deltaE) };
}

/** Average of every recalled tile across all rounds, two decimals. */
export function finalScore(points: readonly number[]): number {
  if (points.length === 0) return 0;
  return Math.round((points.reduce((a, b) => a + b, 0) / points.length) * 100) / 100;
}
