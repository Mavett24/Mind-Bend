import { describe, expect, it } from "vitest";
import { TIERS } from "@/engine/difficulty";
import { adjacency, canExtend, generatePath, isSolved, pathHint, randomHamiltonianPath, solvePath, stepLine, type PathPuzzle } from "./engine";
import { createRng } from "@/engine/rng";

const SEEDS_PER_TIER = 60;

function checkSolutionIsValid(p: PathPuzzle) {
  const total = p.size * p.size;
  const adj = adjacency(p.size, p.walls);
  expect(new Set(p.solution).size).toBe(total);
  for (let i = 1; i < total; i++) expect(adj[p.solution[i - 1]]).toContain(p.solution[i]);
  const order = p.solution.map((c) => p.numbers[c]).filter((n) => n > 0);
  expect(order).toEqual(order.map((_, i) => i + 1));
  expect(p.numbers[p.solution[0]]).toBe(1);
  expect(p.numbers[p.solution[total - 1]]).toBe(Math.max(...p.numbers));
}

describe("path generator", () => {
  for (const tier of TIERS) {
    it(`${tier}: every board has exactly one solution (${SEEDS_PER_TIER} seeds)`, () => {
      for (let i = 0; i < SEEDS_PER_TIER; i++) {
        const p = generatePath({ gameId: "path", tier, seed: `test-${i}` });
        checkSolutionIsValid(p);
        const result = solvePath(p.size, p.numbers, p.walls, 2, 5_000_000);
        expect(result.exhausted).toBe(false);
        expect(result.solutions).toHaveLength(1);
        expect(result.solutions[0]).toEqual(p.solution);
      }
    }, 120_000);
  }

  it("is deterministic per seed and varies across seeds", () => {
    const a = generatePath({ gameId: "path", tier: "hard", seed: "same" });
    const b = generatePath({ gameId: "path", tier: "hard", seed: "same" });
    const c = generatePath({ gameId: "path", tier: "hard", seed: "other" });
    expect(a).toEqual(b);
    expect(a.solution).not.toEqual(c.solution);
  });

  it("scales grid size with tier", () => {
    const sizes = TIERS.map((tier) => generatePath({ gameId: "path", tier, seed: "size" }).size);
    expect(sizes).toEqual([5, 6, 7, 8]);
  });

  it("builds Hamiltonian paths", () => {
    const rng = createRng("ham");
    for (let i = 0; i < 50; i++) {
      const path = randomHamiltonianPath(6, rng);
      expect(new Set(path).size).toBe(36);
      for (let j = 1; j < path.length; j++) {
        const [a, b] = [path[j - 1], path[j]];
        expect(Math.abs(a - b) === 1 ? Math.floor(a / 6) === Math.floor(b / 6) : Math.abs(a - b) === 6).toBe(true);
      }
    }
  });
});

describe("path move rules", () => {
  const p = generatePath({ gameId: "path", tier: "easy", seed: "rules" });
  const adj = adjacency(p.size, p.walls);

  it("accepts the solution step by step and reports solved", () => {
    const line = [p.solution[0]];
    for (let i = 1; i < p.solution.length; i++) {
      expect(canExtend(p, line, p.solution[i], adj)).toBe(true);
      line.push(p.solution[i]);
    }
    expect(isSolved(p, line)).toBe(true);
  });

  it("refuses revisits and out-of-order numbers", () => {
    const line = [p.solution[0], p.solution[1]];
    expect(canExtend(p, line, p.solution[0], adj)).toBe(false);
    const lastNumberCell = p.numbers.indexOf(Math.max(...p.numbers));
    if (adj[p.solution[1]].includes(lastNumberCell)) expect(canExtend(p, line, lastNumberCell, adj)).toBe(false);
    expect(isSolved(p, line)).toBe(false);
  });
});

describe("path line input", () => {
  const p = generatePath({ gameId: "path", tier: "medium", seed: "line-input" });
  const adj = adjacency(p.size, p.walls);
  /** The line one move from the solution: the case where losing work hurts most. */
  const almost = p.solution.slice(0, -1);
  const lastCell = p.solution[p.solution.length - 1];

  /** Feeds cells to `stepLine` the way the board does during one drag. */
  const drag = (line: number[], cells: number[]) =>
    cells.reduce((l, cell) => stepLine(p, l, cell, adj, "drag")?.line ?? l, line);

  it("never removes the line when a drag crosses it", () => {
    // Dragging over every cell already on the line, in any order, leaves it as it was,
    // except the previous cell, which is a deliberate step back.
    for (let i = 0; i < almost.length - 2; i++) {
      expect(stepLine(p, almost, almost[i], adj, "drag")).toBeNull();
    }
    const crossing = [...almost].reverse().slice(2);
    expect(drag(almost, crossing)).toEqual(almost);
  });

  it("finishes the board after a drag wanders across the line", () => {
    const head = almost[almost.length - 1];
    const wander = [...adj[head].filter((n) => almost.includes(n)), almost[3], almost[1], head, lastCell];
    const line = drag(almost, wander.filter((c) => c !== almost[almost.length - 2]));
    expect(line).toEqual(p.solution);
    expect(isSolved(p, line)).toBe(true);
  });

  it("steps back one cell at a time when the drag retraces the line", () => {
    const back = [almost[almost.length - 2], almost[almost.length - 3], almost[almost.length - 4]];
    expect(drag(almost, back)).toEqual(almost.slice(0, -3));
    expect(stepLine(p, almost, almost[almost.length - 2], adj, "drag")?.kind).toBe("back");
  });

  it("cuts the line only on a tap", () => {
    const cut = stepLine(p, almost, almost[5], adj, "tap");
    expect(cut).toEqual({ line: almost.slice(0, 6), kind: "cut" });
    expect(stepLine(p, almost, p.solution[0], adj, "tap")?.line).toEqual([p.solution[0]]);
  });

  it("extends the same way for a drag and a tap", () => {
    for (const input of ["drag", "tap"] as const) {
      expect(stepLine(p, almost, lastCell, adj, input)).toEqual({ line: p.solution, kind: "extend" });
    }
    expect(stepLine(p, almost, almost[almost.length - 1], adj, "tap")).toBeNull();
  });
});

describe("path hints", () => {
  it("leads from an empty line to the solution, one cell per hint", () => {
    for (const tier of TIERS) {
      const p = generatePath({ gameId: "path", tier, seed: `hint-${tier}` });
      let line = [p.solution[0]];
      let hints = 0;
      for (let h = pathHint(p, line); h; h = pathHint(p, line)) {
        expect(h.trimmed).toBe(false);
        line = [...h.line, h.next];
        hints++;
      }
      expect(line).toEqual(p.solution);
      expect(hints).toBe(p.solution.length - 1);
      expect(isSolved(p, line)).toBe(true);
    }
  });

  it("cuts a wrong line back to its last correct cell", () => {
    const p = generatePath({ gameId: "path", tier: "medium", seed: "hint-wrong" });
    const adj = adjacency(p.size, p.walls);
    // Follow the solution for 4 cells, then wander off it.
    const line = p.solution.slice(0, 4);
    const wrong = adj[line[3]].find((n) => !line.includes(n) && n !== p.solution[4]);
    if (wrong === undefined) return;
    const h = pathHint(p, [...line, wrong])!;
    expect(h.trimmed).toBe(true);
    expect(h.line).toEqual(line);
    expect(h.next).toBe(p.solution[4]);
  });
});
