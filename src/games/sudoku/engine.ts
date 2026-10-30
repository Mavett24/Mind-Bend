/**
 * sudoku: fill the grid so every row, column and box holds each number once.
 * Easy is a 6×6 grid (2×3 boxes), the other tiers are 9×9.
 *
 * Fairness and difficulty work like balance (D-018): a board is only accepted if a human-style
 * logic solver finishes it with the techniques allowed for its tier. Logic only places forced
 * numbers, so a board it finishes has exactly one solution. Harder tiers must also need their
 * techniques: a hard board can't be finished with singles alone.
 * Pure TypeScript. See docs/games/sudoku.md.
 */
import { createRng, type Rng } from "@/engine/rng";
import { boardSeed, type BoardKey } from "@/engine/seed";
import type { Tier } from "@/engine/difficulty";

export interface SudokuPuzzle {
  size: number;
  boxRows: number;
  boxCols: number;
  givens: number[]; // 0 = empty
  solution: number[];
  /** Highest technique level the logic solver needed (1 singles, 2 pairs and pointing, 3 triples and X-wing). */
  level: 1 | 2 | 3;
  /** How many advanced steps the solver needed. */
  advanced: number;
}

interface TierConfig {
  size: 6 | 9;
  /** Techniques the player may need. */
  level: 1 | 2 | 3;
  /** The board must need at least this many advanced steps (pairs, pointing and up). 0 = singles only. */
  minAdvanced: number;
  /** Stop removing givens at this count. */
  minGivens: number;
  /** Remove givens in rotationally symmetric pairs (classic look) or one at a time (fewer givens). */
  symmetric: boolean;
}

const CONFIG: Record<Tier, TierConfig> = {
  easy: { size: 6, level: 1, minAdvanced: 0, minGivens: 10, symmetric: true },
  medium: { size: 9, level: 1, minAdvanced: 0, minGivens: 30, symmetric: true },
  hard: { size: 9, level: 2, minAdvanced: 1, minGivens: 26, symmetric: true },
  expert: { size: 9, level: 3, minAdvanced: 3, minGivens: 22, symmetric: false },
};

export const SUDOKU_PAR_MS: Record<Tier, number> = { easy: 90_000, medium: 300_000, hard: 600_000, expert: 900_000 };

// ---------------------------------------------------------------- geometry

export interface Geometry {
  size: number;
  boxRows: number;
  boxCols: number;
  /** All units: rows, then columns, then boxes. */
  units: number[][];
  /** Unit indices for each cell: [row, column, box]. */
  unitsOf: [number, number, number][];
  peers: number[][];
}

const geometryCache = new Map<number, Geometry>();

export function geometry(size: number): Geometry {
  const cached = geometryCache.get(size);
  if (cached) return cached;
  const [boxRows, boxCols] = size === 6 ? [2, 3] : size === 4 ? [2, 2] : [3, 3];
  const units: number[][] = [];
  for (let r = 0; r < size; r++) units.push(Array.from({ length: size }, (_, c) => r * size + c));
  for (let c = 0; c < size; c++) units.push(Array.from({ length: size }, (_, r) => r * size + c));
  for (let br = 0; br < size; br += boxRows) {
    for (let bc = 0; bc < size; bc += boxCols) {
      const box: number[] = [];
      for (let r = br; r < br + boxRows; r++) for (let c = bc; c < bc + boxCols; c++) box.push(r * size + c);
      units.push(box);
    }
  }
  const unitsOf: [number, number, number][] = [];
  for (let cell = 0; cell < size * size; cell++) {
    const r = Math.floor(cell / size);
    const c = cell % size;
    const b = Math.floor(r / boxRows) * (size / boxCols) + Math.floor(c / boxCols);
    unitsOf.push([r, size + c, 2 * size + b]);
  }
  const peers = unitsOf.map((us, cell) => [...new Set(us.flatMap((u) => units[u]))].filter((p) => p !== cell));
  const g = { size, boxRows, boxCols, units, unitsOf, peers };
  geometryCache.set(size, g);
  return g;
}

export const unitKind = (g: Geometry, u: number) => (u < g.size ? "row" : u < 2 * g.size ? "column" : "box");
export const unitName = (g: Geometry, u: number) => `${unitKind(g, u)} ${(u % g.size) + 1}`;

const bit = (d: number) => 1 << d;
const popcount = (m: number) => {
  let n = 0;
  while (m) {
    m &= m - 1;
    n++;
  }
  return n;
};
const digitsOf = (m: number) => {
  const out: number[] = [];
  for (let d = 1; m >> d; d++) if (m & bit(d)) out.push(d);
  return out;
};

// ---------------------------------------------------------------- logic solver

interface State {
  values: number[];
  cand: number[];
}

/** Candidates from placed numbers only. Returns null if a placed number clashes with a peer. */
export function initialState(size: number, grid: readonly number[]): State | null {
  const g = geometry(size);
  const full = ((1 << (size + 1)) - 1) & ~1;
  const values = grid.slice();
  const cand = values.map(() => full);
  for (let cell = 0; cell < values.length; cell++) {
    const d = values[cell];
    if (!d) continue;
    cand[cell] = 0;
    for (const p of g.peers[cell]) {
      if (values[p] === d) return null;
      cand[p] &= ~bit(d);
    }
  }
  return { values, cand };
}

export type Technique =
  | "naked-single"
  | "hidden-single"
  | "pointing"
  | "claiming"
  | "naked-pair"
  | "hidden-pair"
  | "naked-triple"
  | "hidden-triple"
  | "x-wing";

export const TECHNIQUE_LEVEL: Record<Technique, 1 | 2 | 3> = {
  "naked-single": 1,
  "hidden-single": 1,
  pointing: 2,
  claiming: 2,
  "naked-pair": 2,
  "hidden-pair": 2,
  "naked-triple": 3,
  "hidden-triple": 3,
  "x-wing": 3,
};

export type Step =
  | { kind: "place"; technique: Technique; cell: number; digit: number; unit?: number }
  | { kind: "eliminate"; technique: Technique; removals: { cell: number; digit: number }[]; cells: number[]; digits: number[]; units: number[] };

/** The simplest next step allowed at `level`, or null when stuck. */
export function nextStep(g: Geometry, s: State, level: 1 | 2 | 3): Step | null {
  const { units } = g;
  const empty = (c: number) => s.values[c] === 0;

  // Naked single
  for (let cell = 0; cell < s.values.length; cell++) {
    if (empty(cell) && popcount(s.cand[cell]) === 1) return { kind: "place", technique: "naked-single", cell, digit: digitsOf(s.cand[cell])[0] };
  }
  // Hidden single (boxes first: easiest for people to spot)
  const unitOrder = [...units.keys()].sort((a, b) => (a >= 2 * g.size ? -1 : 0) - (b >= 2 * g.size ? -1 : 0));
  for (const u of unitOrder) {
    for (let d = 1; d <= g.size; d++) {
      if (units[u].some((c) => s.values[c] === d)) continue;
      const spots = units[u].filter((c) => empty(c) && s.cand[c] & bit(d));
      if (spots.length === 1) return { kind: "place", technique: "hidden-single", cell: spots[0], digit: d, unit: u };
    }
  }
  if (level < 2) return null;

  const eliminate = (technique: Technique, removals: { cell: number; digit: number }[], cells: number[], digits: number[], unitsUsed: number[]): Step | null =>
    removals.length ? { kind: "eliminate", technique, removals, cells, digits, units: unitsUsed } : null;

  // Pointing (box → line) and claiming (line → box)
  for (let u = 0; u < units.length; u++) {
    const isBox = u >= 2 * g.size;
    for (let d = 1; d <= g.size; d++) {
      const spots = units[u].filter((c) => empty(c) && s.cand[c] & bit(d));
      if (spots.length < 2) continue;
      for (const k of isBox ? [0, 1] : [2]) {
        const shared = g.unitsOf[spots[0]][k];
        if (!spots.every((c) => g.unitsOf[c][k] === shared)) continue;
        const removals = units[shared].filter((c) => !spots.includes(c) && empty(c) && s.cand[c] & bit(d)).map((cell) => ({ cell, digit: d }));
        const step = eliminate(isBox ? "pointing" : "claiming", removals, spots, [d], [u, shared]);
        if (step) return step;
      }
    }
  }

  // Naked and hidden subsets
  const subsets = (n: number, technique: { naked: Technique; hidden: Technique }): Step | null => {
    for (let u = 0; u < units.length; u++) {
      const cells = units[u].filter(empty);
      // Naked: n cells whose candidates together are exactly n digits.
      const combos = (arr: number[], k: number, start = 0, pick: number[] = []): number[][] =>
        pick.length === k ? [pick] : arr.slice(start).flatMap((x, i) => combos(arr, k, start + i + 1, [...pick, x]));
      for (const group of combos(cells.filter((c) => popcount(s.cand[c]) <= n), n)) {
        const mask = group.reduce((m, c) => m | s.cand[c], 0);
        if (popcount(mask) !== n) continue;
        const removals = cells
          .filter((c) => !group.includes(c))
          .flatMap((c) => digitsOf(s.cand[c] & mask).map((digit) => ({ cell: c, digit })));
        const step = eliminate(technique.naked, removals, group, digitsOf(mask), [u]);
        if (step) return step;
      }
      // Hidden: n digits that only fit in the same n cells.
      const missing = Array.from({ length: g.size }, (_, i) => i + 1).filter((d) => !units[u].some((c) => s.values[c] === d));
      for (const digits of combos(missing, n)) {
        const spots = cells.filter((c) => digits.some((d) => s.cand[c] & bit(d)));
        if (spots.length !== n || !digits.every((d) => spots.some((c) => s.cand[c] & bit(d)))) continue;
        const keep = digits.reduce((m, d) => m | bit(d), 0);
        const removals = spots.flatMap((c) => digitsOf(s.cand[c] & ~keep).map((digit) => ({ cell: c, digit })));
        const step = eliminate(technique.hidden, removals, spots, digits, [u]);
        if (step) return step;
      }
    }
    return null;
  };
  const pairs = subsets(2, { naked: "naked-pair", hidden: "hidden-pair" });
  if (pairs) return pairs;
  if (level < 3) return null;
  const triples = subsets(3, { naked: "naked-triple", hidden: "hidden-triple" });
  if (triples) return triples;

  // X-wing on rows, then on columns
  for (const [lineBase, crossBase] of [
    [0, g.size],
    [g.size, 0],
  ]) {
    for (let d = 1; d <= g.size; d++) {
      const positions = Array.from({ length: g.size }, (_, i) =>
        units[lineBase + i].map((c, idx) => (empty(c) && s.cand[c] & bit(d) ? idx : -1)).filter((x) => x >= 0),
      );
      for (let a = 0; a < g.size; a++) {
        if (positions[a].length !== 2) continue;
        for (let b = a + 1; b < g.size; b++) {
          if (positions[b].length !== 2 || positions[b][0] !== positions[a][0] || positions[b][1] !== positions[a][1]) continue;
          const crosses = positions[a].map((idx) => crossBase + idx);
          const corners = [units[lineBase + a], units[lineBase + b]].flatMap((line) => positions[a].map((idx) => line[idx]));
          const removals = crosses
            .flatMap((cu) => units[cu])
            .filter((c) => !corners.includes(c) && empty(c) && s.cand[c] & bit(d))
            .map((cell) => ({ cell, digit: d }));
          const step = eliminate("x-wing", removals, corners, [d], [lineBase + a, lineBase + b]);
          if (step) return step;
        }
      }
    }
  }
  return null;
}

function apply(g: Geometry, s: State, step: Step): void {
  if (step.kind === "place") {
    s.values[step.cell] = step.digit;
    s.cand[step.cell] = 0;
    for (const p of g.peers[step.cell]) s.cand[p] &= ~bit(step.digit);
  } else {
    for (const { cell, digit } of step.removals) s.cand[cell] &= ~bit(digit);
  }
}

export interface LogicResult {
  solved: boolean;
  values: number[];
  /** Highest technique level used. */
  level: 0 | 1 | 2 | 3;
  /** Number of steps above singles. */
  advanced: number;
}

export function solveLogic(size: number, grid: readonly number[], level: 1 | 2 | 3): LogicResult {
  const g = geometry(size);
  const s = initialState(size, grid);
  if (!s) return { solved: false, values: grid.slice(), level: 0, advanced: 0 };
  let used: 0 | 1 | 2 | 3 = 0;
  let advanced = 0;
  for (let guard = 0; guard < 5000; guard++) {
    if (s.values.every((v) => v)) return { solved: true, values: s.values, level: used, advanced };
    if (s.values.some((v, c) => !v && !s.cand[c])) break; // contradiction
    const step = nextStep(g, s, level);
    if (!step) break;
    used = Math.max(used, TECHNIQUE_LEVEL[step.technique]) as 0 | 1 | 2 | 3;
    if (TECHNIQUE_LEVEL[step.technique] > 1) advanced++;
    apply(g, s, step);
  }
  return { solved: false, values: s.values, level: used, advanced };
}

/** Brute-force solution counter (most constrained cell first), used by tests. */
export function countSolutions(size: number, grid: readonly number[], limit = 2): number {
  const g = geometry(size);
  const s = initialState(size, grid);
  if (!s) return 0;
  let count = 0;
  const search = (values: number[], cand: number[]) => {
    if (count >= limit) return;
    let best = -1;
    let bestCount = Infinity;
    for (let c = 0; c < values.length; c++) {
      if (values[c]) continue;
      const n = popcount(cand[c]);
      if (n === 0) return;
      if (n < bestCount) {
        bestCount = n;
        best = c;
      }
    }
    if (best < 0) {
      count++;
      return;
    }
    for (const d of digitsOf(cand[best])) {
      const v = values.slice();
      const k = cand.slice();
      v[best] = d;
      k[best] = 0;
      for (const p of g.peers[best]) k[p] &= ~bit(d);
      search(v, k);
    }
  };
  search(s.values, s.cand);
  return count;
}

// ---------------------------------------------------------------- generator

function fullGrid(size: number, rng: Rng): number[] {
  const g = geometry(size);
  const values = new Array(size * size).fill(0);
  const fill = (cell: number): boolean => {
    if (cell === values.length) return true;
    const used = new Set(g.peers[cell].map((p) => values[p]));
    for (const d of rng.shuffle(Array.from({ length: size }, (_, i) => i + 1))) {
      if (used.has(d)) continue;
      values[cell] = d;
      if (fill(cell + 1)) return true;
    }
    values[cell] = 0;
    return false;
  };
  fill(0);
  return values;
}

export function generateSudoku(key: BoardKey): SudokuPuzzle {
  const cfg = CONFIG[key.tier];
  const { size } = cfg;
  const g = geometry(size);
  const root = createRng(boardSeed(key));
  let fallback: SudokuPuzzle | null = null;

  for (let attempt = 0; attempt < 60; attempt++) {
    const rng = root.fork(`attempt-${attempt}`);
    const solution = fullGrid(size, rng.fork("grid"));
    const givens = solution.slice();
    let count = givens.length;
    const removeRng = rng.fork("remove");
    const order = cfg.symmetric
      ? removeRng.shuffle([...givens.keys()].filter((c) => c <= givens.length - 1 - c))
      : removeRng.shuffle([...givens.keys()]);
    for (const cell of order) {
      const twin = givens.length - 1 - cell;
      const pair = !cfg.symmetric || cell === twin ? [cell] : [cell, twin];
      if (count - pair.length < cfg.minGivens) continue;
      const kept = pair.map((c) => givens[c]);
      pair.forEach((c) => (givens[c] = 0));
      if (solveLogic(size, givens, cfg.level).solved) count -= pair.length;
      else pair.forEach((c, i) => (givens[c] = kept[i]));
    }
    const graded = solveLogic(size, givens, cfg.level);
    const puzzle: SudokuPuzzle = {
      size,
      boxRows: g.boxRows,
      boxCols: g.boxCols,
      givens,
      solution,
      level: Math.max(1, graded.level) as 1 | 2 | 3,
      advanced: graded.advanced,
    };
    // Singles-only tiers must not need anything harder (they can't: level caps it). Harder tiers need enough advanced steps.
    if (puzzle.advanced >= cfg.minAdvanced) return puzzle;
    // Keep the hardest board seen, in case no attempt reaches the tier's floor.
    if (!fallback || puzzle.advanced > fallback.advanced) fallback = puzzle;
  }
  return fallback!;
}

// ---------------------------------------------------------------- player rules

/** Cells whose number repeats in a row, column or box. */
export function conflicts(size: number, grid: readonly number[]): Set<number> {
  const g = geometry(size);
  const out = new Set<number>();
  for (const unit of g.units) {
    const seen = new Map<number, number[]>();
    for (const c of unit) if (grid[c]) seen.set(grid[c], [...(seen.get(grid[c]) ?? []), c]);
    for (const cells of seen.values()) if (cells.length > 1) cells.forEach((c) => out.add(c));
  }
  return out;
}

export const isSolved = (puzzle: SudokuPuzzle, grid: readonly number[]) => grid.every((v, i) => v === puzzle.solution[i]);

// ---------------------------------------------------------------- hints

export interface SudokuHint {
  kind: "wrong" | "place";
  cell: number;
  digit: number | null;
  reason: string;
  /** Cells that justify the hint, shown softly. */
  related: number[];
}

function describe(g: Geometry, step: Step): string {
  if (step.kind === "place") {
    if (step.technique === "naked-single") return `Only ${step.digit} fits here: its row, column and box already have every other number.`;
    return `In ${unitName(g, step.unit!)}, ${step.digit} can only go here.`;
  }
  const [d] = step.digits;
  const list = (ds: number[]) => ds.slice(0, -1).join(", ") + (ds.length > 1 ? ` and ${ds.at(-1)}` : `${ds[0]}`);
  switch (step.technique) {
    case "pointing":
      return `In ${unitName(g, step.units[0])}, ${d} can only be in ${unitName(g, step.units[1])}, so ${d} can't go anywhere else in that ${unitKind(g, step.units[1])}.`;
    case "claiming":
      return `In ${unitName(g, step.units[0])}, ${d} can only be in ${unitName(g, step.units[1])}, so no other cell in that box can be ${d}.`;
    case "naked-pair":
    case "naked-triple":
      return `In ${unitName(g, step.units[0])}, ${step.cells.length} cells can only hold ${list(step.digits)}, so no other cell there can.`;
    case "hidden-pair":
    case "hidden-triple":
      return `In ${unitName(g, step.units[0])}, ${list(step.digits)} only fit in the same ${step.cells.length} cells, so those cells hold nothing else.`;
    case "x-wing":
      return `${d} sits in the same two spots in ${unitName(g, step.units[0])} and ${unitName(g, step.units[1])} (an X-wing), so it can't go elsewhere in those two lines.`;
    default:
      return "";
  }
}

/**
 * The next number to place and why. A wrong number is pointed out first.
 * When no single is visible, the advanced steps that unlock one are applied silently and the
 * first one is explained, so the player learns the pattern that mattered.
 */
export function sudokuHint(puzzle: SudokuPuzzle, grid: readonly number[]): SudokuHint | null {
  const { size, givens, solution } = puzzle;
  const g = geometry(size);
  for (let c = 0; c < grid.length; c++) {
    if (grid[c] && !givens[c] && grid[c] !== solution[c]) {
      return { kind: "wrong", cell: c, digit: null, reason: `${grid[c]} doesn't belong here: the board can't be finished with it. Clear it and look again.`, related: [] };
    }
  }
  if (grid.every((v) => v)) return null;
  const s = initialState(size, grid)!;
  let firstAdvanced: Step | null = null;
  for (let guard = 0; guard < 500; guard++) {
    const step = nextStep(g, s, 3);
    if (!step) break;
    if (step.kind === "place") {
      const placeText = describe(g, step);
      const related =
        step.technique === "hidden-single" ? g.units[step.unit!].filter((c) => c !== step.cell) : g.peers[step.cell].filter((p) => s.values[p]);
      if (!firstAdvanced) return { kind: "place", cell: step.cell, digit: step.digit, reason: placeText, related };
      return {
        kind: "place",
        cell: step.cell,
        digit: step.digit,
        reason: `${describe(g, firstAdvanced)} That leaves ${step.digit} as the only option here.`,
        related: firstAdvanced.kind === "eliminate" ? firstAdvanced.cells : related,
      };
    }
    firstAdvanced ??= step;
    apply(g, s, step);
  }
  // Beyond the solver's techniques (shouldn't happen on generated boards): fall back to the answer.
  const cell = grid.findIndex((v) => !v);
  return { kind: "place", cell, digit: solution[cell], reason: `This one is ${solution[cell]}.`, related: [] };
}
