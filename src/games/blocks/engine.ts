/**
 * blocks: split the grid into rectangles. Each rectangle holds exactly one clue,
 * matching its area and, when shown, its shape (square, wide, tall).
 * Pure TypeScript. See docs/games/blocks.md.
 */
import { createRng, type Rng } from "@/engine/rng";
import { boardSeed, type BoardKey } from "@/engine/seed";
import type { Tier } from "@/engine/difficulty";

export type Shape = "square" | "wide" | "tall" | "any";

export interface Rect {
  r: number;
  c: number;
  h: number;
  w: number;
}

export interface Clue {
  cell: number;
  area: number;
  shape: Shape;
  /** Board palette index, chosen so neighbouring rectangles never share a colour. */
  color: number;
}

export interface BlocksPuzzle {
  size: number;
  clues: Clue[];
  /** solution[i] is the rectangle for clues[i]. */
  solution: Rect[];
}

interface TierConfig {
  size: number;
  minArea: number;
  maxArea: number;
  /** Share of clues whose shape is hidden ("any"), if uniqueness allows. */
  hideShapes: number;
}

const CONFIG: Record<Tier, TierConfig> = {
  easy: { size: 5, minArea: 2, maxArea: 6, hideShapes: 0 },
  medium: { size: 6, minArea: 2, maxArea: 8, hideShapes: 0.25 },
  hard: { size: 7, minArea: 2, maxArea: 9, hideShapes: 0.5 },
  expert: { size: 8, minArea: 3, maxArea: 12, hideShapes: 0.8 },
};

export const BLOCKS_PAR_MS: Record<Tier, number> = { easy: 30_000, medium: 60_000, hard: 120_000, expert: 210_000 };
export const PALETTE_SIZE = 8;

// ---------------------------------------------------------------- geometry

export const shapeOf = (rect: Pick<Rect, "h" | "w">): Exclude<Shape, "any"> =>
  rect.w === rect.h ? "square" : rect.w > rect.h ? "wide" : "tall";

export const rectCells = (rect: Rect, size: number): number[] => {
  const out: number[] = [];
  for (let r = rect.r; r < rect.r + rect.h; r++) for (let c = rect.c; c < rect.c + rect.w; c++) out.push(r * size + c);
  return out;
};

export const rectContains = (rect: Rect, size: number, cell: number): boolean => {
  const r = Math.floor(cell / size);
  const c = cell % size;
  return r >= rect.r && r < rect.r + rect.h && c >= rect.c && c < rect.c + rect.w;
};

export const sameRect = (a: Rect, b: Rect) => a.r === b.r && a.c === b.c && a.h === b.h && a.w === b.w;

/** A rectangle from two corner cells, in any order. */
export function rectFromCorners(size: number, a: number, b: number): Rect {
  const [ra, ca, rb, cb] = [Math.floor(a / size), a % size, Math.floor(b / size), b % size];
  return { r: Math.min(ra, rb), c: Math.min(ca, cb), h: Math.abs(ra - rb) + 1, w: Math.abs(ca - cb) + 1 };
}

/** Does `rect` satisfy `clue` (contains it, right area, right shape)? Ignores other clues. */
export function fitsClue(rect: Rect, clue: Clue, size: number): boolean {
  if (!rectContains(rect, size, clue.cell)) return false;
  if (rect.h * rect.w !== clue.area) return false;
  return clue.shape === "any" || shapeOf(rect) === clue.shape;
}

// ---------------------------------------------------------------- solver

/** Every rectangle that could belong to each clue: right area and shape, containing that clue and no other. */
export function candidates(size: number, clues: readonly Clue[]): Rect[][] {
  const clueAt = new Int32Array(size * size).fill(-1);
  clues.forEach((clue, i) => (clueAt[clue.cell] = i));
  return clues.map((clue, i) => {
    const out: Rect[] = [];
    const cr = Math.floor(clue.cell / size);
    const cc = clue.cell % size;
    for (let h = 1; h <= clue.area; h++) {
      if (clue.area % h) continue;
      const w = clue.area / h;
      if (h > size || w > size) continue;
      if (clue.shape !== "any" && shapeOf({ h, w }) !== clue.shape) continue;
      for (let r = Math.max(0, cr - h + 1); r <= Math.min(cr, size - h); r++) {
        for (let c = Math.max(0, cc - w + 1); c <= Math.min(cc, size - w); c++) {
          const rect = { r, c, h, w };
          if (rectCells(rect, size).every((cell) => clueAt[cell] === -1 || clueAt[cell] === i)) out.push(rect);
        }
      }
    }
    return out;
  });
}

/**
 * Exact cover search: every cell covered exactly once, one rectangle per clue.
 * Always branches on the uncovered cell with the fewest options. Counts up to `limit`.
 */
export function solveBlocks(size: number, clues: readonly Clue[], limit = 2): Rect[][] {
  const total = size * size;
  const options = candidates(size, clues);
  const optionCells = options.map((list) => list.map((rect) => rectCells(rect, size)));
  // For each cell, the (clue, option) pairs that cover it.
  const coverers: [number, number][][] = Array.from({ length: total }, () => []);
  optionCells.forEach((list, ci) => list.forEach((cells, oi) => cells.forEach((cell) => coverers[cell].push([ci, oi]))));

  const covered = new Uint8Array(total);
  const used = new Uint8Array(clues.length);
  const chosen = new Int32Array(clues.length).fill(-1);
  const solutions: Rect[][] = [];

  const free = (ci: number, oi: number) => optionCells[ci][oi].every((cell) => !covered[cell]);

  const search = (coveredCount: number) => {
    if (solutions.length >= limit) return;
    if (coveredCount === total) {
      solutions.push(Array.from(chosen, (oi, ci) => options[ci][oi]));
      return;
    }
    let bestCell = -1;
    let bestCount = Infinity;
    for (let cell = 0; cell < total; cell++) {
      if (covered[cell]) continue;
      let count = 0;
      for (const [ci, oi] of coverers[cell]) if (!used[ci] && free(ci, oi)) count++;
      if (count < bestCount) {
        bestCount = count;
        bestCell = cell;
        if (count <= 1) break;
      }
    }
    if (bestCount === 0) return;
    for (const [ci, oi] of coverers[bestCell]) {
      if (used[ci] || !free(ci, oi)) continue;
      const cells = optionCells[ci][oi];
      used[ci] = 1;
      chosen[ci] = oi;
      for (const cell of cells) covered[cell] = 1;
      search(coveredCount + cells.length);
      for (const cell of cells) covered[cell] = 0;
      used[ci] = 0;
      chosen[ci] = -1;
      if (solutions.length >= limit) return;
    }
  };

  search(0);
  return solutions;
}

// ---------------------------------------------------------------- generator

/** Tile the grid with random rectangles, filling from the top-left free cell each time. */
function randomPartition(cfg: TierConfig, rng: Rng): Rect[] | null {
  const { size } = cfg;
  const taken = new Uint8Array(size * size);
  const rects: Rect[] = [];
  for (let cell = 0; cell < size * size; cell++) {
    if (taken[cell]) continue;
    const r = Math.floor(cell / size);
    const c = cell % size;
    // Widest run of free cells to the right on this row.
    let maxW = 0;
    while (c + maxW < size && !taken[r * size + c + maxW]) maxW++;
    const options: Rect[] = [];
    for (let w = 1; w <= maxW; w++) {
      for (let h = 1; r + h <= size; h++) {
        const area = w * h;
        if (area > cfg.maxArea) break;
        // Rows below are free in the scan order except where earlier rects reached down.
        let ok = true;
        for (let rr = r; rr < r + h && ok; rr++) for (let cc = c; cc < c + w && ok; cc++) if (taken[rr * size + cc]) ok = false;
        if (!ok) break;
        if (area >= cfg.minArea) options.push({ r, c, h, w });
      }
    }
    if (options.length === 0) return null; // boxed into a too-small gap: start over
    // Prefer mid-sized pieces so boards aren't all slivers or slabs.
    const weighted = options.flatMap((o) => (o.h * o.w >= 3 && o.h * o.w <= cfg.maxArea - 1 ? [o, o, o] : [o]));
    const rect = rng.pick(weighted);
    rects.push(rect);
    for (const cellIn of rectCells(rect, size)) taken[cellIn] = 1;
  }
  return rects;
}

/** Greedy colouring of the rectangle adjacency graph so touching rectangles get different colours. */
function colourRects(rects: Rect[], size: number, rng: Rng): number[] {
  const owner = new Int32Array(size * size);
  rects.forEach((rect, i) => rectCells(rect, size).forEach((cell) => (owner[cell] = i)));
  const neighbours = rects.map(() => new Set<number>());
  for (let cell = 0; cell < size * size; cell++) {
    const right = cell % size < size - 1 ? cell + 1 : -1;
    const down = cell + size < size * size ? cell + size : -1;
    for (const n of [right, down]) {
      if (n >= 0 && owner[n] !== owner[cell]) {
        neighbours[owner[cell]].add(owner[n]);
        neighbours[owner[n]].add(owner[cell]);
      }
    }
  }
  const colours = new Array(rects.length).fill(-1);
  const palette = rng.shuffle(Array.from({ length: PALETTE_SIZE }, (_, i) => i));
  for (let i = 0; i < rects.length; i++) {
    const used = new Set([...neighbours[i]].map((n) => colours[n]));
    colours[i] = palette.find((p) => !used.has(p)) ?? palette[i % PALETTE_SIZE];
  }
  return colours;
}

export function generateBlocks(key: BoardKey): BlocksPuzzle {
  const cfg = CONFIG[key.tier];
  const { size } = cfg;
  const root = createRng(boardSeed(key));

  for (let attempt = 0; attempt < 60; attempt++) {
    const rng = root.fork(`attempt-${attempt}`);
    const rects = randomPartition(cfg, rng.fork("partition"));
    if (!rects) continue;

    const placeRng = rng.fork("clues");
    const clueCells = rects.map((rect) => placeRng.pick(rectCells(rect, size)));
    let clues: Clue[] = rects.map((rect, i) => ({ cell: clueCells[i], area: rect.h * rect.w, shape: shapeOf(rect), color: 0 }));

    // Re-roll clue positions inside rectangles that an alternative solution changes.
    let unique = false;
    for (let fix = 0; fix < 30; fix++) {
      const sols = solveBlocks(size, clues);
      if (sols.length === 1) {
        unique = true;
        break;
      }
      const alt = sols.find((s) => s.some((rect, i) => !sameRect(rect, rects[i])));
      if (!alt) break;
      clues = clues.map((clue, i) =>
        sameRect(alt[i], rects[i]) ? clue : { ...clue, cell: placeRng.pick(rectCells(rects[i], size)) },
      );
    }
    if (!unique) continue;

    // Harder tiers: hide shapes while the board stays unique.
    const target = Math.round(clues.length * cfg.hideShapes);
    let hidden = 0;
    for (const i of rng.fork("hide").shuffle(clues.map((_, i) => i))) {
      if (hidden >= target) break;
      if (clues[i].shape === "square" && rects[i].h * rects[i].w === 1) continue;
      const trial = clues.map((clue, j) => (j === i ? { ...clue, shape: "any" as Shape } : clue));
      if (solveBlocks(size, trial).length === 1) {
        clues = trial;
        hidden++;
      }
    }

    const colours = colourRects(rects, size, rng.fork("colour"));
    clues = clues.map((clue, i) => ({ ...clue, color: colours[i] }));
    return { size, clues, solution: rects };
  }
  throw new Error(`blocks: no unique board for ${boardSeed(key)}`);
}

// ---------------------------------------------------------------- player state

/** A placed rectangle and the clue it satisfies (-1 if it doesn't satisfy exactly one clue). */
export interface Placed {
  rect: Rect;
  clue: number;
}

/** Which clue a drawn rectangle belongs to: exactly one clue inside, and it fits. Otherwise -1. */
export function matchClue(rect: Rect, puzzle: BlocksPuzzle): number {
  const inside = puzzle.clues.map((clue, i) => (rectContains(rect, puzzle.size, clue.cell) ? i : -1)).filter((i) => i >= 0);
  if (inside.length !== 1) return -1;
  return fitsClue(rect, puzzle.clues[inside[0]], puzzle.size) ? inside[0] : -1;
}

export function isSolved(puzzle: BlocksPuzzle, placed: readonly Placed[]): boolean {
  if (placed.length !== puzzle.clues.length || placed.some((p) => p.clue < 0)) return false;
  const covered = new Uint8Array(puzzle.size * puzzle.size);
  for (const p of placed) {
    for (const cell of rectCells(p.rect, puzzle.size)) {
      if (covered[cell]) return false;
      covered[cell] = 1;
    }
  }
  return covered.every(Boolean) && new Set(placed.map((p) => p.clue)).size === puzzle.clues.length;
}
