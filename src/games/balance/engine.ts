/**
 * balance: fill the grid with dots and rings.
 * Each line holds equal counts, never three of a kind in a row, and = / × links between cells hold.
 * Pure TypeScript. See docs/games/balance.md.
 *
 * Fairness: a board is only accepted if a deduction solver (no guessing) completes it.
 * Deduction from valid rules can only reach the one solution, so this also proves uniqueness.
 */
import { createRng, type Rng } from "@/engine/rng";
import { boardSeed, type BoardKey } from "@/engine/seed";
import type { Tier } from "@/engine/difficulty";

export const EMPTY = 0;
export const DOT = 1;
export const RING = 2;
export type Cell = 0 | 1 | 2;

export type LinkType = "eq" | "neq";
export interface Link {
  a: number;
  b: number;
  type: LinkType;
}

export interface BalancePuzzle {
  size: number;
  givens: Cell[];
  links: Link[];
  solution: Cell[];
}

interface TierConfig {
  size: number;
  links: [number, number];
  /** Stop removing givens at this count. */
  minGivens: number;
  /** 1 = rule propagation only. 2 = propagation plus one step of lookahead. */
  level: 1 | 2;
}

const CONFIG: Record<Tier, TierConfig> = {
  easy: { size: 6, links: [3, 4], minGivens: 13, level: 1 },
  medium: { size: 6, links: [5, 6], minGivens: 9, level: 1 },
  hard: { size: 6, links: [6, 8], minGivens: 4, level: 1 },
  expert: { size: 8, links: [8, 12], minGivens: 6, level: 2 },
};

export const BALANCE_PAR_MS: Record<Tier, number> = { easy: 45_000, medium: 90_000, hard: 150_000, expert: 300_000 };

const opposite = (v: Cell): Cell => (v === DOT ? RING : DOT);

/** Every row and column as a list of cell indices. */
export function lines(size: number): number[][] {
  const out: number[][] = [];
  for (let r = 0; r < size; r++) out.push(Array.from({ length: size }, (_, c) => r * size + c));
  for (let c = 0; c < size; c++) out.push(Array.from({ length: size }, (_, r) => r * size + c));
  return out;
}

// ---------------------------------------------------------------- validation

export interface Violations {
  /** Line indices (rows 0..n-1, columns n..2n-1) that break the count or triple rule. */
  lines: Set<number>;
  /** Link indices whose constraint is broken. */
  links: Set<number>;
}

/** Rule breaks visible on a partially filled grid. Empty cells never count as a break. */
export function findViolations(size: number, grid: readonly Cell[], links: readonly Link[]): Violations {
  const half = size / 2;
  const out: Violations = { lines: new Set(), links: new Set() };
  lines(size).forEach((line, li) => {
    let dots = 0;
    let rings = 0;
    for (let i = 0; i < line.length; i++) {
      const v = grid[line[i]];
      if (v === DOT) dots++;
      if (v === RING) rings++;
      if (i >= 2 && v !== EMPTY && v === grid[line[i - 1]] && v === grid[line[i - 2]]) out.lines.add(li);
    }
    if (dots > half || rings > half) out.lines.add(li);
  });
  links.forEach((link, i) => {
    const [va, vb] = [grid[link.a], grid[link.b]];
    if (va === EMPTY || vb === EMPTY) return;
    if ((link.type === "eq") !== (va === vb)) out.links.add(i);
  });
  return out;
}

export function isSolved(size: number, grid: readonly Cell[], links: readonly Link[]): boolean {
  if (grid.some((v) => v === EMPTY)) return false;
  const v = findViolations(size, grid, links);
  return v.lines.size === 0 && v.links.size === 0;
}

// ---------------------------------------------------------------- deduction solver

type PropagateResult = "ok" | "contradiction";

/** Applies the rules until nothing changes. Mutates grid. */
function propagate(size: number, grid: Cell[], allLines: number[][], links: readonly Link[]): PropagateResult {
  const half = size / 2;
  let changed = true;
  const set = (cell: number, v: Cell): boolean => {
    if (grid[cell] === v) return true;
    if (grid[cell] !== EMPTY) return false;
    grid[cell] = v;
    changed = true;
    return true;
  };

  while (changed) {
    changed = false;
    for (const line of allLines) {
      let dots = 0;
      let rings = 0;
      for (const c of line) {
        if (grid[c] === DOT) dots++;
        else if (grid[c] === RING) rings++;
      }
      if (dots > half || rings > half) return "contradiction";
      // count rule
      if (dots === half || rings === half) {
        const fill = dots === half ? RING : DOT;
        for (const c of line) if (grid[c] === EMPTY && !set(c, fill)) return "contradiction";
      }
      // triple rules
      for (let i = 0; i + 2 < line.length; i++) {
        const [x, y, z] = [grid[line[i]], grid[line[i + 1]], grid[line[i + 2]]];
        if (x !== EMPTY && x === y && y === z) return "contradiction";
        if (x !== EMPTY && x === y && z === EMPTY && !set(line[i + 2], opposite(x))) return "contradiction";
        if (y !== EMPTY && y === z && x === EMPTY && !set(line[i], opposite(y))) return "contradiction";
        if (x !== EMPTY && x === z && y === EMPTY && !set(line[i + 1], opposite(x))) return "contradiction";
      }
    }
    for (const { a, b, type } of links) {
      const [va, vb] = [grid[a], grid[b]];
      if (va !== EMPTY && vb !== EMPTY) {
        if ((type === "eq") !== (va === vb)) return "contradiction";
      } else if (va !== EMPTY) {
        if (!set(b, type === "eq" ? va : opposite(va))) return "contradiction";
      } else if (vb !== EMPTY) {
        if (!set(a, type === "eq" ? vb : opposite(vb))) return "contradiction";
      }
    }
  }
  return "ok";
}

/** Solves by deduction only. Returns the grid if fully solved, otherwise null. */
export function solveByDeduction(
  size: number,
  givens: readonly Cell[],
  links: readonly Link[],
  level: 1 | 2,
): Cell[] | null {
  const allLines = lines(size);
  const grid = givens.slice() as Cell[];
  if (propagate(size, grid, allLines, links) === "contradiction") return null;

  if (level === 2) {
    let progress = true;
    while (progress && grid.includes(EMPTY)) {
      progress = false;
      for (let cell = 0; cell < grid.length; cell++) {
        if (grid[cell] !== EMPTY) continue;
        for (const v of [DOT, RING] as const) {
          const trial = grid.slice() as Cell[];
          trial[cell] = v;
          if (propagate(size, trial, allLines, links) === "contradiction") {
            grid[cell] = opposite(v);
            if (propagate(size, grid, allLines, links) === "contradiction") return null;
            progress = true;
            break;
          }
        }
      }
    }
  }
  return grid.includes(EMPTY) ? null : grid;
}

/** Brute-force solution counter, used by tests to double-check uniqueness. */
export function countSolutions(size: number, givens: readonly Cell[], links: readonly Link[], limit = 2): number {
  const allLines = lines(size);
  let count = 0;
  const search = (grid: Cell[]) => {
    if (count >= limit) return;
    if (propagate(size, grid, allLines, links) === "contradiction") return;
    const cell = grid.indexOf(EMPTY);
    if (cell === -1) {
      if (isSolved(size, grid, links)) count++;
      return;
    }
    for (const v of [DOT, RING] as const) {
      const next = grid.slice() as Cell[];
      next[cell] = v;
      search(next);
    }
  };
  search(givens.slice() as Cell[]);
  return count;
}

// ---------------------------------------------------------------- generator

function randomFullGrid(size: number, rng: Rng): Cell[] {
  const half = size / 2;
  const grid: Cell[] = new Array(size * size).fill(EMPTY);
  const fits = (cell: number, v: Cell): boolean => {
    const r = Math.floor(cell / size);
    const c = cell % size;
    let rowCount = 0;
    let colCount = 0;
    for (let i = 0; i < size; i++) {
      if (grid[r * size + i] === v) rowCount++;
      if (grid[i * size + c] === v) colCount++;
    }
    if (rowCount >= half || colCount >= half) return false;
    if (c >= 2 && grid[cell - 1] === v && grid[cell - 2] === v) return false;
    if (r >= 2 && grid[cell - size] === v && grid[cell - 2 * size] === v) return false;
    return true;
  };
  const fill = (cell: number): boolean => {
    if (cell === grid.length) return true;
    for (const v of rng.shuffle([DOT, RING] as const)) {
      if (!fits(cell, v)) continue;
      grid[cell] = v;
      if (fill(cell + 1)) return true;
      grid[cell] = EMPTY;
    }
    return false;
  };
  if (!fill(0)) throw new Error("balance: could not build a full grid");
  return grid;
}

export function generateBalance(key: BoardKey): BalancePuzzle {
  const cfg = CONFIG[key.tier];
  const rng = createRng(boardSeed(key));
  const { size } = cfg;
  const solution = randomFullGrid(size, rng.fork("grid"));

  // Links between random adjacent pairs, read off the solution.
  const linkRng = rng.fork("links");
  const pairs: [number, number][] = [];
  for (let cell = 0; cell < size * size; cell++) {
    if (cell % size < size - 1) pairs.push([cell, cell + 1]);
    if (cell + size < size * size) pairs.push([cell, cell + size]);
  }
  const linkCount = linkRng.int(cfg.links[0], cfg.links[1]);
  const links: Link[] = linkRng
    .shuffle(pairs)
    .slice(0, linkCount)
    .map(([a, b]) => ({ a, b, type: solution[a] === solution[b] ? "eq" : "neq" }));

  // Remove givens one at a time while the board stays solvable by deduction.
  const givens = solution.slice() as Cell[];
  let count = givens.length;
  for (const cell of rng.fork("remove").shuffle(givens.map((_, i) => i))) {
    if (count <= cfg.minGivens) break;
    const keep = givens[cell];
    givens[cell] = EMPTY;
    if (solveByDeduction(size, givens, links, cfg.level)) count--;
    else givens[cell] = keep;
  }

  return { size, givens, links, solution };
}

// ---------------------------------------------------------------- hints

export interface BalanceHint {
  kind: "wrong" | "deduce";
  cell: number;
  /** What the cell must be (deduce), or null (wrong: clear it). */
  value: Cell | null;
  /** One or two plain sentences. */
  reason: string;
  /** Cells that justify the hint, shown softly. */
  related: number[];
}

const NAME: Record<1 | 2, string> = { 1: "dot", 2: "ring" };
const PLURAL: Record<1 | 2, string> = { 1: "dots", 2: "rings" };
const name = (v: Cell) => NAME[v as 1 | 2];

/**
 * The simplest next move with the rule that forces it.
 * Order: wrong cells first, then links, pairs, gaps, full lines, then one step of "what if".
 * Every board is solvable by these rules (D-018), so a deduction always exists while cells are empty.
 */
export function balanceHint(puzzle: BalancePuzzle, grid: readonly Cell[]): BalanceHint | null {
  const { size, givens, links, solution } = puzzle;
  const half = size / 2;
  const allLines = lines(size);
  const lineName = (li: number) => (li < size ? `row ${li + 1}` : `column ${li - size + 1}`);

  for (let c = 0; c < grid.length; c++) {
    if (grid[c] !== EMPTY && givens[c] === EMPTY && grid[c] !== solution[c]) {
      return {
        kind: "wrong",
        cell: c,
        value: null,
        reason: `This can't be a ${name(grid[c])}: the board can't be finished with it. Clear it and look again.`,
        related: [],
      };
    }
  }
  if (!grid.includes(EMPTY)) return null;

  const deduce = (cell: number, value: Cell, reason: string, related: number[]): BalanceHint => ({ kind: "deduce", cell, value, reason, related });

  // Links
  for (const { a, b, type } of links) {
    const [va, vb] = [grid[a], grid[b]];
    if ((va === EMPTY) === (vb === EMPTY)) continue;
    const [known, empty, kv] = va !== EMPTY ? [a, b, va] : [b, a, vb];
    const value = type === "eq" ? kv : opposite(kv);
    const why = type === "eq" ? "= means these two cells match" : "× means these two cells are opposite";
    return deduce(empty, value, `${why}, so this one is a ${name(value)}.`, [known]);
  }

  // Pairs and gaps
  for (const line of allLines) {
    for (let i = 0; i + 2 < line.length; i++) {
      const [x, y, z] = [line[i], line[i + 1], line[i + 2]];
      const [vx, vy, vz] = [grid[x], grid[y], grid[z]];
      if (vx !== EMPTY && vx === vy && vz === EMPTY)
        return deduce(z, opposite(vx), `Two ${PLURAL[vx as 1 | 2]} side by side, so the next cell must be a ${name(opposite(vx))}.`, [x, y]);
      if (vy !== EMPTY && vy === vz && vx === EMPTY)
        return deduce(x, opposite(vy), `Two ${PLURAL[vy as 1 | 2]} side by side, so the cell before them must be a ${name(opposite(vy))}.`, [y, z]);
      if (vx !== EMPTY && vx === vz && vy === EMPTY)
        return deduce(y, opposite(vx), `A ${name(vx)} on both sides, so the middle must be a ${name(opposite(vx))}.`, [x, z]);
    }
  }

  // Full lines
  for (let li = 0; li < allLines.length; li++) {
    const line = allLines[li];
    for (const v of [DOT, RING] as const) {
      const have = line.filter((c) => grid[c] === v);
      const empty = line.find((c) => grid[c] === EMPTY);
      if (have.length === half && empty !== undefined) {
        return deduce(
          empty,
          opposite(v),
          `${lineName(li)[0].toUpperCase()}${lineName(li).slice(1)} already has ${half} ${PLURAL[v]}, so the rest are ${PLURAL[opposite(v) as 1 | 2]}.`,
          have,
        );
      }
    }
  }

  // One step of "what if"
  for (let cell = 0; cell < grid.length; cell++) {
    if (grid[cell] !== EMPTY) continue;
    for (const v of [DOT, RING] as const) {
      const trial = grid.slice() as Cell[];
      trial[cell] = v;
      if (propagate(size, trial, allLines, links) === "contradiction") {
        return deduce(
          cell,
          opposite(v),
          `Try a ${name(v)} here and follow the rules: a row or column breaks. So it has to be a ${name(opposite(v))}.`,
          [],
        );
      }
    }
  }

  // Should be unreachable for generated boards; keeps hints working on anything else.
  const cell = grid.indexOf(EMPTY);
  return deduce(cell, solution[cell], `Only a ${name(solution[cell])} works here.`, []);
}
