/**
 * weave: a grid made entirely of hidden words. Trace each word through neighbouring letters
 * (including diagonals). Every letter belongs to exactly one hidden word.
 * Pure TypeScript given the word data. See docs/games/weave.md.
 */
import { createRng, type Rng } from "@/engine/rng";
import { boardSeed, type BoardKey } from "@/engine/seed";
import type { Tier } from "@/engine/difficulty";

export interface WeaveData {
  targets: Record<Tier, string[]>;
  valid: string[];
}

export interface HiddenWord {
  word: string;
  /** Cell indices in reading order. */
  cells: number[];
}

export interface WeavePuzzle {
  size: number;
  letters: string[];
  words: HiddenWord[];
  /** Every word the player may find (hidden or not), for "not in this grid" feedback. */
  valid: ReadonlySet<string>;
}

interface TierConfig {
  size: number;
  minLen: number;
  maxLen: number;
}

const CONFIG: Record<Tier, TierConfig> = {
  easy: { size: 4, minLen: 4, maxLen: 4 },
  medium: { size: 5, minLen: 4, maxLen: 6 },
  hard: { size: 6, minLen: 5, maxLen: 7 },
  expert: { size: 6, minLen: 5, maxLen: 8 },
};

export const WEAVE_PAR_MS: Record<Tier, number> = { easy: 45_000, medium: 90_000, hard: 150_000, expert: 240_000 };
export const MIN_WORD = 3;

// ---------------------------------------------------------------- grid helpers

/** 8-way neighbours. */
export function neighbours8(size: number, cell: number): number[] {
  const r = Math.floor(cell / size);
  const c = cell % size;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < size && cc >= 0 && cc < size) out.push(rr * size + cc);
    }
  }
  return out;
}

export const adjacent8 = (size: number, a: number, b: number) =>
  a !== b && Math.abs(Math.floor(a / size) - Math.floor(b / size)) <= 1 && Math.abs((a % size) - (b % size)) <= 1;

/** For a diagonal step a→b, the two cells of the other diagonal of that 2×2 square. */
function crossingPair(size: number, a: number, b: number): [number, number] | null {
  const [ra, ca, rb, cb] = [Math.floor(a / size), a % size, Math.floor(b / size), b % size];
  if (ra === rb || ca === cb) return null;
  return [ra * size + cb, rb * size + ca];
}

const edge = (a: number, b: number) => (a < b ? a * 4096 + b : b * 4096 + a);

// ---------------------------------------------------------------- generator

/** Can `n` cells be split into words of `min`..`max` letters? */
const fillable = (n: number, min: number, max: number): boolean => n === 0 || (n >= min && n >= min * Math.ceil(n / max));

/** Random word lengths in [min, max] that sum exactly to total. Only picks lengths that leave a fillable remainder. */
export function lengthPlan(total: number, cfg: Pick<TierConfig, "minLen" | "maxLen">, rng: Rng): number[] {
  if (!fillable(total, cfg.minLen, cfg.maxLen)) throw new Error("weave: grid size can't be split into words");
  const plan: number[] = [];
  let left = total;
  while (left > 0) {
    const options: number[] = [];
    for (let len = cfg.minLen; len <= Math.min(cfg.maxLen, left); len++) {
      if (fillable(left - len, cfg.minLen, cfg.maxLen)) options.push(len);
    }
    const len = rng.pick(options); // never empty: `left` is fillable, so some first word works
    plan.push(len);
    left -= len;
  }
  return rng.shuffle(plan);
}

/**
 * Carve the grid into non-crossing paths with the planned lengths.
 * Each path starts at the free cell with the fewest free neighbours and prefers tight corners,
 * so the grid doesn't leave isolated gaps behind.
 */
function carvePaths(size: number, plan: number[], cfg: TierConfig, rng: Rng): number[][] | null {
  const free = new Uint8Array(size * size).fill(1);
  const diagonals = new Set<number>();
  const paths: number[][] = [];
  const freeDegree = (cell: number) => neighbours8(size, cell).filter((n) => free[n]).length;
  const canStep = (a: number, b: number) => {
    if (!free[b]) return false;
    const cross = crossingPair(size, a, b);
    return !cross || !diagonals.has(edge(cross[0], cross[1]));
  };

  for (const len of plan) {
    const freeCells = [...free.keys()].filter((c) => free[c]);
    if (freeCells.length === 0) return null;
    const minDeg = Math.min(...freeCells.map(freeDegree));
    const start = rng.pick(freeCells.filter((c) => freeDegree(c) === minDeg));

    // Depth-first walk with a small amount of backtracking.
    const path = [start];
    free[start] = 0;
    const grow = (budget: { n: number }): boolean => {
      if (path.length === len) return true;
      if (--budget.n < 0) return false;
      const head = path[path.length - 1];
      const options = rng.shuffle(neighbours8(size, head).filter((n) => canStep(head, n)));
      options.sort((x, y) => freeDegree(x) - freeDegree(y));
      for (const next of options) {
        // Record diagonal steps as they happen, so a word can't cross its own earlier steps either.
        const diagonal = crossingPair(size, head, next) ? edge(head, next) : -1;
        if (diagonal >= 0) diagonals.add(diagonal);
        free[next] = 0;
        path.push(next);
        if (grow(budget)) return true;
        path.pop();
        free[next] = 1;
        if (diagonal >= 0) diagonals.delete(diagonal);
      }
      return false;
    };
    if (!grow({ n: 400 })) {
      return null;
    }
    paths.push(path);

    // Every leftover region must still be big enough for a word.
    const seen = new Uint8Array(size * size);
    for (const cell of free.keys()) {
      if (!free[cell] || seen[cell]) continue;
      let count = 0;
      const stack = [cell];
      seen[cell] = 1;
      while (stack.length) {
        const c = stack.pop()!;
        count++;
        for (const n of neighbours8(size, c)) {
          if (free[n] && !seen[n]) {
            seen[n] = 1;
            stack.push(n);
          }
        }
      }
      if (count < cfg.minLen) return null;
    }
  }
  return free.every((f) => f === 0) ? paths : null;
}

export function generateWeaveFrom(key: BoardKey, data: WeaveData): WeavePuzzle {
  const cfg = CONFIG[key.tier];
  const { size } = cfg;
  const root = createRng(boardSeed(key));
  const byLength = new Map<number, string[]>();
  for (const w of data.targets[key.tier]) {
    if (!byLength.has(w.length)) byLength.set(w.length, []);
    byLength.get(w.length)!.push(w);
  }

  for (let attempt = 0; attempt < 300; attempt++) {
    const rng = root.fork(`attempt-${attempt}`);
    const plan = lengthPlan(size * size, cfg, rng.fork("plan"));
    if (plan.some((len) => !byLength.get(len)?.length)) continue;
    const paths = carvePaths(size, plan, cfg, rng.fork("carve"));
    if (!paths) continue;

    const wordRng = rng.fork("words");
    const used = new Set<string>();
    const letters = new Array<string>(size * size).fill("");
    const words: HiddenWord[] = paths.map((cells) => {
      const pool = byLength.get(cells.length)!.filter((w) => !used.has(w));
      const word = wordRng.pick(pool);
      used.add(word);
      cells.forEach((cell, i) => (letters[cell] = word[i]));
      return { word, cells };
    });
    return { size, letters, words, valid: new Set(data.valid) };
  }
  throw new Error(`weave: no board for ${boardSeed(key)}`);
}

// ---------------------------------------------------------------- player rules

export type TraceResult =
  | { kind: "found"; index: number }
  | { kind: "repeat"; index: number }
  | { kind: "elsewhere" } // a real word, but not one of this grid's hidden words
  | { kind: "short" }
  | { kind: "invalid" };

export const wordOf = (puzzle: WeavePuzzle, cells: readonly number[]) => cells.map((c) => puzzle.letters[c]).join("");

/** Is `cells` a legal trace: distinct, each step to an 8-way neighbour? */
export function isValidTrace(size: number, cells: readonly number[]): boolean {
  if (new Set(cells).size !== cells.length) return false;
  for (let i = 1; i < cells.length; i++) if (!adjacent8(size, cells[i - 1], cells[i])) return false;
  return true;
}

/**
 * A trace matches a hidden word when it spells that word over exactly that word's cells.
 * (Same cells and same spelling, so repeated letters traced in a different order still count.)
 */
export function judgeTrace(puzzle: WeavePuzzle, cells: readonly number[], found: ReadonlySet<number>): TraceResult {
  if (cells.length < MIN_WORD) return { kind: "short" };
  if (!isValidTrace(puzzle.size, cells)) return { kind: "invalid" };
  const word = wordOf(puzzle, cells);
  const cellSet = new Set(cells);
  const index = puzzle.words.findIndex((w) => w.word === word && w.cells.length === cells.length && w.cells.every((c) => cellSet.has(c)));
  if (index >= 0) return found.has(index) ? { kind: "repeat", index } : { kind: "found", index };
  return puzzle.valid.has(word) ? { kind: "elsewhere" } : { kind: "invalid" };
}

// ---------------------------------------------------------------- data loading (client)

let cache: Promise<WeaveData> | null = null;

export function loadWeaveData(): Promise<WeaveData> {
  cache ??= fetch("/data/weave/words.json").then((r) => {
    if (!r.ok) throw new Error(`weave data: ${r.status}`);
    return r.json() as Promise<WeaveData>;
  });
  cache.catch(() => (cache = null));
  return cache;
}

export async function generateWeave(key: BoardKey): Promise<WeavePuzzle> {
  return generateWeaveFrom(key, await loadWeaveData());
}
