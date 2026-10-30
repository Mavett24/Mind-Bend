import { describe, expect, it } from "vitest";
import { TIERS } from "@/engine/difficulty";
import { adjacency, canExtend, generatePath, isSolved, randomHamiltonianPath, solvePath, type PathPuzzle } from "./engine";
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
