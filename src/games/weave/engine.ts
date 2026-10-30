/**
 * weave: a grid of hidden words plus a few empty tiles, in the style of LinkedIn Wend.
 * Trace each word through letters that touch up, down, left or right (no diagonals).
 * Every letter belongs to exactly one hidden word, and the word lengths are shown.
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
  /** One letter per cell, or "" for an empty (blocked) tile. */
  letters: string[];
  words: HiddenWord[];
  /** Every word the player may find (hidden or not), for "not hidden here" feedback. */
  valid: ReadonlySet<string>;
}

interface TierConfig {
  size: number;
  /** Word-length sets to choose from. Cells not used by words become empty tiles. */
  plans: number[][];
}

const CONFIG: Record<Tier, TierConfig> = {
  easy: { size: 4, plans: [[4, 4, 5], [3, 4, 5], [4, 4, 4]] },
  medium: { size: 5, plans: [[4, 5, 6, 6], [4, 5, 5, 6], [5, 5, 5, 6]] },
  hard: { size: 6, plans: [[4, 5, 6, 7, 8], [5, 5, 6, 7, 7], [4, 6, 6, 7, 7]] },
  expert: { size: 6, plans: [[5, 6, 7, 8, 8], [6, 6, 7, 7, 8]] },
};

export const WEAVE_PAR_MS: Record<Tier, number> = { easy: 45_000, medium: 90_000, hard: 150_000, expert: 240_000 };
export const MIN_WORD = 3;
export const isBlocked = (puzzle: Pick<WeavePuzzle, "letters">, cell: number) => puzzle.letters[cell] === "";

// ---------------------------------------------------------------- grid helpers

/** Up, down, left, right. */
export function neighbours4(size: number, cell: number): number[] {
  const r = Math.floor(cell / size);
  const c = cell % size;
  const out: number[] = [];
  if (r > 0) out.push(cell - size);
  if (r < size - 1) out.push(cell + size);
  if (c > 0) out.push(cell - 1);
  if (c < size - 1) out.push(cell + 1);
  return out;
}

export const adjacent4 = (size: number, a: number, b: number) => {
  const dr = Math.abs(Math.floor(a / size) - Math.floor(b / size));
  const dc = Math.abs((a % size) - (b % size));
  return dr + dc === 1;
};

// ---------------------------------------------------------------- generator

/**
 * Scatter the empty tiles first, then cover every remaining cell exactly with word paths.
 * Empty tiles never touch each other side by side, so they read as scattered blocks like Wend.
 * Each path starts on the free cell with the fewest free neighbours (so no cell gets stranded)
 * and grows towards tight spots for the same reason.
 */
function placeBlocked(size: number, count: number, rng: Rng): Uint8Array | null {
  const blocked = new Uint8Array(size * size);
  let placed = 0;
  for (const cell of rng.shuffle([...blocked.keys()])) {
    if (placed === count) break;
    if (neighbours4(size, cell).some((n) => blocked[n])) continue;
    blocked[cell] = 1;
    placed++;
  }
  return placed === count ? blocked : null;
}

function carvePaths(size: number, lengths: number[], blocked: Uint8Array, rng: Rng): number[][] | null {
  const free = new Uint8Array(size * size).map((_, i) => (blocked[i] ? 0 : 1));
  const freeDegree = (cell: number) => neighbours4(size, cell).filter((n) => free[n]).length;
  const regions = () => {
    const seen = new Uint8Array(size * size);
    const sizes: number[] = [];
    for (let start = 0; start < size * size; start++) {
      if (!free[start] || seen[start]) continue;
      let count = 0;
      const stack = [start];
      seen[start] = 1;
      while (stack.length) {
        const c = stack.pop()!;
        count++;
        for (const n of neighbours4(size, c)) {
          if (free[n] && !seen[n]) {
            seen[n] = 1;
            stack.push(n);
          }
        }
      }
      sizes.push(count);
    }
    return sizes;
  };

  const remaining = [...lengths].sort((a, b) => b - a);
  const paths: number[][] = [];
  while (remaining.length) {
    const len = remaining.shift()!;
    const freeCells = [...free.keys()].filter((c) => free[c]);
    const minDeg = Math.min(...freeCells.map(freeDegree));
    const start = rng.pick(freeCells.filter((c) => freeDegree(c) === minDeg));
    const path = [start];
    free[start] = 0;
    const budget = { n: 800 };
    const shortest = remaining.length ? Math.min(...remaining) : 0;
    const grow = (): boolean => {
      if (path.length === len) {
        // Every leftover region must still be fillable by at least the shortest remaining word.
        return regions().every((r) => r >= shortest && shortest > 0) || remaining.length === 0;
      }
      if (--budget.n < 0) return false;
      const head = path[path.length - 1];
      const options = rng.shuffle(neighbours4(size, head).filter((n) => free[n]));
      options.sort((x, y) => freeDegree(x) - freeDegree(y));
      for (const next of options) {
        free[next] = 0;
        path.push(next);
        if (grow()) return true;
        path.pop();
        free[next] = 1;
      }
      return false;
    };
    if (!grow()) return null;
    paths.push(path);
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

  for (let attempt = 0; attempt < 2000; attempt++) {
    const rng = root.fork(`attempt-${attempt}`);
    const plan = rng.pick(cfg.plans);
    if (plan.some((len) => (byLength.get(len)?.length ?? 0) < plan.length)) continue;
    const blocked = placeBlocked(size, size * size - plan.reduce((a, b) => a + b, 0), rng.fork("blocked"));
    if (!blocked) continue;
    const paths = carvePaths(size, plan, blocked, rng.fork("carve"));
    if (!paths) continue;

    const wordRng = rng.fork("words");
    const used = new Set<string>();
    const letters = new Array<string>(size * size).fill("");
    const words: HiddenWord[] = paths.map((cells) => {
      const word = wordRng.pick(byLength.get(cells.length)!.filter((w) => !used.has(w)));
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

/** Is `cells` a legal trace: distinct letter cells, each step up, down, left or right? */
export function isValidTrace(puzzle: Pick<WeavePuzzle, "size" | "letters">, cells: readonly number[]): boolean {
  if (new Set(cells).size !== cells.length) return false;
  if (cells.some((c) => isBlocked(puzzle, c))) return false;
  for (let i = 1; i < cells.length; i++) if (!adjacent4(puzzle.size, cells[i - 1], cells[i])) return false;
  return true;
}

/** A trace matches a hidden word when it spells that word over exactly that word's cells. */
export function judgeTrace(puzzle: WeavePuzzle, cells: readonly number[], found: ReadonlySet<number>): TraceResult {
  if (cells.length < MIN_WORD) return { kind: "short" };
  if (!isValidTrace(puzzle, cells)) return { kind: "invalid" };
  const word = wordOf(puzzle, cells);
  const cellSet = new Set(cells);
  const index = puzzle.words.findIndex((w) => w.word === word && w.cells.length === cells.length && w.cells.every((c) => cellSet.has(c)));
  if (index >= 0) return found.has(index) ? { kind: "repeat", index } : { kind: "found", index };
  return puzzle.valid.has(word) ? { kind: "elsewhere" } : { kind: "invalid" };
}

/** Word indices sorted for the length slots: shortest first, then by position on the board. */
export function slotOrder(puzzle: WeavePuzzle): number[] {
  return puzzle.words
    .map((w, i) => i)
    .sort((a, b) => puzzle.words[a].word.length - puzzle.words[b].word.length || puzzle.words[a].cells[0] - puzzle.words[b].cells[0]);
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
