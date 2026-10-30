/**
 * path: draw one line through every cell, visiting the numbered cells in order.
 * Pure TypeScript. See docs/games/path.md.
 */
import { createRng, type Rng } from "@/engine/rng";
import { boardSeed, type BoardKey } from "@/engine/seed";
import type { Tier } from "@/engine/difficulty";

export interface PathPuzzle {
  size: number;
  /** Per cell: checkpoint number (1..k) or 0. */
  numbers: number[];
  /** Blocked edges between adjacent cells, as [a, b] with a < b. */
  walls: [number, number][];
  /** The generator's path, cell indices in order. Unique by construction. */
  solution: number[];
}

interface TierConfig {
  size: number;
  /** Initial checkpoint spacing along the path. */
  spacing: number;
  /** Random walls added before solving. */
  initialWalls: [number, number];
  /** Remove checkpoints while the board stays unique, down to this count. */
  minCheckpoints: number | null;
  /** Whether uniqueness fixes may add walls (otherwise checkpoints only). */
  wallFixes: boolean;
  maxWalls: number;
}

const CONFIG: Record<Tier, TierConfig> = {
  easy: { size: 5, spacing: 3, initialWalls: [0, 0], minCheckpoints: null, wallFixes: false, maxWalls: 0 },
  medium: { size: 6, spacing: 4, initialWalls: [0, 0], minCheckpoints: 9, wallFixes: false, maxWalls: 0 },
  hard: { size: 7, spacing: 4, initialWalls: [0, 3], minCheckpoints: 6, wallFixes: true, maxWalls: 4 },
  expert: { size: 8, spacing: 4, initialWalls: [2, 5], minCheckpoints: 5, wallFixes: true, maxWalls: 8 },
};

const REDUCE_BUDGET = 40_000;

/** Par time per tier in ms, used for score lines and rating. */
export const PATH_PAR_MS: Record<Tier, number> = { easy: 30_000, medium: 60_000, hard: 120_000, expert: 180_000 };

// ---------------------------------------------------------------- grid helpers

export const edgeKey = (a: number, b: number) => (a < b ? a * 4096 + b : b * 4096 + a);

export function gridNeighbors(size: number, cell: number): number[] {
  const r = Math.floor(cell / size);
  const c = cell % size;
  const out: number[] = [];
  if (r > 0) out.push(cell - size);
  if (r < size - 1) out.push(cell + size);
  if (c > 0) out.push(cell - 1);
  if (c < size - 1) out.push(cell + 1);
  return out;
}

/** Neighbour lists with walls removed. */
export function adjacency(size: number, walls: readonly [number, number][]): number[][] {
  const blocked = new Set(walls.map(([a, b]) => edgeKey(a, b)));
  return Array.from({ length: size * size }, (_, cell) =>
    gridNeighbors(size, cell).filter((n) => !blocked.has(edgeKey(cell, n))),
  );
}

// ---------------------------------------------------------------- hamiltonian path

/** Random Hamiltonian path: start from a serpentine and randomise with backbite moves. */
export function randomHamiltonianPath(size: number, rng: Rng): number[] {
  const path: number[] = [];
  for (let r = 0; r < size; r++) {
    for (let i = 0; i < size; i++) path.push(r * size + (r % 2 === 0 ? i : size - 1 - i));
  }
  const n = path.length;
  const pos = new Int32Array(n);
  const reindex = (from: number, to: number) => {
    for (let i = from; i <= to; i++) pos[path[i]] = i;
  };
  reindex(0, n - 1);

  const reverse = (from: number, to: number) => {
    for (let i = from, j = to; i < j; i++, j--) [path[i], path[j]] = [path[j], path[i]];
    reindex(from, to);
  };

  const moves = 30 * n;
  for (let m = 0; m < moves; m++) {
    if (rng.chance(0.5)) {
      // backbite at the end
      const end = path[n - 1];
      const options = gridNeighbors(size, end).filter((v) => v !== path[n - 2]);
      const v = rng.pick(options);
      reverse(pos[v] + 1, n - 1);
    } else {
      // backbite at the start
      const start = path[0];
      const options = gridNeighbors(size, start).filter((v) => v !== path[1]);
      const v = rng.pick(options);
      reverse(0, pos[v] - 1);
    }
  }
  return path;
}

// ---------------------------------------------------------------- solver

export interface SolveResult {
  solutions: number[][];
  /** True if the node budget ran out before the search finished. */
  exhausted: boolean;
  nodes: number;
}

/**
 * Finds up to `limit` solutions. Prunes on connectivity and dead-end cells.
 * A result with exhausted = true proves nothing about uniqueness.
 */
export function solvePath(
  size: number,
  numbers: readonly number[],
  walls: readonly [number, number][],
  limit = 2,
  budget = 400_000,
): SolveResult {
  const total = size * size;
  const adj = adjacency(size, walls);
  const maxNumber = Math.max(...numbers);
  const startCell = numbers.indexOf(1);
  const endCell = numbers.indexOf(maxNumber);
  const visited = new Uint8Array(total);
  const path: number[] = [startCell];
  const solutions: number[][] = [];
  const queue = new Int32Array(total);
  const seen = new Uint8Array(total);
  let nodes = 0;
  let exhausted = false;

  visited[startCell] = 1;

  const hasExits = (cell: number, head: number): boolean => {
    let degree = 0;
    for (const n of adj[cell]) if (!visited[n] || n === head) degree++;
    return degree >= (cell === endCell ? 1 : 2);
  };

  /**
   * Unvisited cells must stay connected to the head and keep enough exits.
   * Only neighbours of the new and previous head can lose exits, so only those are checked.
   */
  const feasible = (head: number, prevHead: number): boolean => {
    const remaining = total - path.length;
    if (remaining === 0) return true;
    for (const cell of adj[head]) if (!visited[cell] && !hasExits(cell, head)) return false;
    for (const cell of adj[prevHead]) if (!visited[cell] && !hasExits(cell, head)) return false;
    // connectivity check from the head
    seen.fill(0);
    let qh = 0;
    let qt = 0;
    let reached = 0;
    for (const n of adj[head]) {
      if (!visited[n] && !seen[n]) {
        seen[n] = 1;
        queue[qt++] = n;
      }
    }
    while (qh < qt) {
      const cell = queue[qh++];
      reached++;
      for (const n of adj[cell]) {
        if (!visited[n] && !seen[n]) {
          seen[n] = 1;
          queue[qt++] = n;
        }
      }
    }
    return reached === remaining;
  };

  const dfs = (head: number, expected: number): void => {
    if (solutions.length >= limit || exhausted) return;
    if (++nodes > budget) {
      exhausted = true;
      return;
    }
    if (path.length === total) {
      if (head === endCell && expected > maxNumber) solutions.push(path.slice());
      return;
    }
    for (const next of adj[head]) {
      if (visited[next]) continue;
      const num = numbers[next];
      if (num !== 0 && num !== expected) continue;
      if (next === endCell && path.length + 1 < total) continue;
      visited[next] = 1;
      path.push(next);
      if (feasible(next, head)) dfs(next, num === expected ? expected + 1 : expected);
      path.pop();
      visited[next] = 0;
      if (solutions.length >= limit || exhausted) return;
    }
  };

  dfs(startCell, 2);
  return { solutions, exhausted, nodes };
}

// ---------------------------------------------------------------- generator

function numbersFromCheckpoints(size: number, solution: readonly number[], indices: Iterable<number>): number[] {
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  const numbers = new Array(size * size).fill(0);
  sorted.forEach((pathIndex, i) => {
    numbers[solution[pathIndex]] = i + 1;
  });
  return numbers;
}

function isUnique(
  size: number,
  numbers: number[],
  walls: [number, number][],
  budget = 400_000,
): SolveResult & { unique: boolean } {
  const result = solvePath(size, numbers, walls, 2, budget);
  return { ...result, unique: !result.exhausted && result.solutions.length === 1 };
}

export function generatePath(key: BoardKey): PathPuzzle {
  const cfg = CONFIG[key.tier];
  const rng = createRng(boardSeed(key));
  const { size } = cfg;
  const total = size * size;
  const solution = randomHamiltonianPath(size, rng.fork("path"));
  const pathIndex = new Int32Array(total);
  solution.forEach((cell, i) => (pathIndex[cell] = i));

  // Initial checkpoints: both ends plus jittered spacing.
  const cpRng = rng.fork("checkpoints");
  const checkpoints = new Set<number>([0, total - 1]);
  for (let i = cfg.spacing; i < total - 1; i += cfg.spacing) {
    const jitter = cpRng.int(-1, 1);
    checkpoints.add(Math.min(total - 2, Math.max(1, i + jitter)));
  }

  // Initial walls: between adjacent cells that are not consecutive on the path.
  const wallRng = rng.fork("walls");
  const walls: [number, number][] = [];
  const wallSet = new Set<number>();
  const candidateEdges: [number, number][] = [];
  for (let cell = 0; cell < total; cell++) {
    for (const n of gridNeighbors(size, cell)) {
      if (n > cell && Math.abs(pathIndex[cell] - pathIndex[n]) !== 1) candidateEdges.push([cell, n]);
    }
  }
  const addWall = (a: number, b: number) => {
    const k = edgeKey(a, b);
    if (wallSet.has(k)) return false;
    wallSet.add(k);
    walls.push(a < b ? [a, b] : [b, a]);
    return true;
  };
  const initialWalls = wallRng.int(cfg.initialWalls[0], cfg.initialWalls[1]);
  for (const [a, b] of wallRng.shuffle(candidateEdges).slice(0, initialWalls)) addWall(a, b);

  // Make it unique: each alternative solution is ruled out by a wall or by two ordered checkpoints.
  const fixRng = rng.fork("fix");
  for (let guard = 0; guard < 200; guard++) {
    const numbers = numbersFromCheckpoints(size, solution, checkpoints);
    const result = isUnique(size, numbers, walls);
    if (result.unique) break;
    const alt = result.solutions.find((s) => s.some((c, i) => c !== solution[i]));
    if (!alt) {
      // Budget ran out without a second solution: tighten with a random checkpoint.
      checkpoints.add(fixRng.int(1, total - 2));
      continue;
    }
    const k = alt.findIndex((c, i) => c !== solution[i]);
    const altCell = alt[k];
    if (cfg.wallFixes && walls.length < cfg.maxWalls && fixRng.chance(0.5)) {
      addWall(solution[k - 1], altCell); // the alternative's first divergent move becomes impossible
    } else {
      checkpoints.add(k); // the true path visits trueCell before altCell, the alternative does the opposite
      checkpoints.add(pathIndex[altCell]);
    }
  }

  // Harder tiers: strip checkpoints while the board stays unique.
  if (cfg.minCheckpoints !== null) {
    const removable = rng.fork("reduce").shuffle([...checkpoints].filter((i) => i !== 0 && i !== total - 1));
    for (const idx of removable) {
      if (checkpoints.size <= cfg.minCheckpoints) break;
      checkpoints.delete(idx);
      // A smaller budget here: if uniqueness is slow to prove, the checkpoint simply stays.
      if (!isUnique(size, numbersFromCheckpoints(size, solution, checkpoints), walls, REDUCE_BUDGET).unique) {
        checkpoints.add(idx);
      }
    }
  }

  return { size, numbers: numbersFromCheckpoints(size, solution, checkpoints), walls, solution };
}

// ---------------------------------------------------------------- move rules (shared with the board UI)

/** Can the line extend from `head` to `next`? */
export function canExtend(puzzle: PathPuzzle, line: readonly number[], next: number, adj: number[][]): boolean {
  const head = line[line.length - 1];
  if (!adj[head].includes(next) || line.includes(next)) return false;
  const expected = line.reduce((n, cell) => (puzzle.numbers[cell] === n ? n + 1 : n), 1);
  const num = puzzle.numbers[next];
  return num === 0 || num === expected;
}

export function isSolved(puzzle: PathPuzzle, line: readonly number[]): boolean {
  if (line.length !== puzzle.size * puzzle.size) return false;
  const max = Math.max(...puzzle.numbers);
  return puzzle.numbers[line[line.length - 1]] === max;
}
