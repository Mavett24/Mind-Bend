import { describe, expect, it } from "vitest";
import { TIERS } from "@/engine/difficulty";
import {
  balanceHint,
  countSolutions,
  DOT,
  EMPTY,
  findViolations,
  generateBalance,
  isSolved,
  RING,
  solveByDeduction,
  type Cell,
} from "./engine";

const SEEDS_PER_TIER = 100;

describe("balance generator", () => {
  for (const tier of TIERS) {
    it(`${tier}: every board has exactly one solution and needs no guessing (${SEEDS_PER_TIER} seeds)`, () => {
      const level = tier === "expert" ? 2 : 1;
      for (let i = 0; i < SEEDS_PER_TIER; i++) {
        const p = generateBalance({ gameId: "balance", tier, seed: `test-${i}` });
        expect(isSolved(p.size, p.solution, p.links)).toBe(true);
        expect(countSolutions(p.size, p.givens, p.links)).toBe(1);
        expect(solveByDeduction(p.size, p.givens, p.links, level)).toEqual(p.solution);
        p.givens.forEach((g, cell) => {
          if (g !== EMPTY) expect(g).toBe(p.solution[cell]);
        });
      }
    }, 120_000);
  }

  it("gets harder by tier: fewer givens or a bigger grid", () => {
    const avgGivens = (tier: (typeof TIERS)[number]) => {
      let sum = 0;
      for (let i = 0; i < 20; i++) {
        sum += generateBalance({ gameId: "balance", tier, seed: `g-${i}` }).givens.filter((g) => g !== EMPTY).length;
      }
      return sum / 20;
    };
    expect(avgGivens("easy")).toBeGreaterThan(avgGivens("medium"));
    expect(avgGivens("medium")).toBeGreaterThan(avgGivens("hard"));
    expect(generateBalance({ gameId: "balance", tier: "expert", seed: "x" }).size).toBe(8);
  });

  it("is deterministic per seed", () => {
    const a = generateBalance({ gameId: "balance", tier: "hard", seed: "same" });
    expect(generateBalance({ gameId: "balance", tier: "hard", seed: "same" })).toEqual(a);
    expect(generateBalance({ gameId: "balance", tier: "hard", seed: "other" }).solution).not.toEqual(a.solution);
  });
});

describe("balance rules", () => {
  it("flags three in a row, overfull lines and broken links", () => {
    const size = 6;
    const grid: Cell[] = new Array(36).fill(EMPTY);
    grid[0] = grid[1] = grid[2] = DOT;
    expect(findViolations(size, grid, []).lines.has(0)).toBe(true);

    const grid2: Cell[] = new Array(36).fill(EMPTY);
    [0, 2, 4, 5].forEach((c) => (grid2[c] = RING));
    expect(findViolations(size, grid2, []).lines.has(0)).toBe(true);

    const grid3: Cell[] = new Array(36).fill(EMPTY);
    grid3[0] = DOT;
    grid3[1] = RING;
    expect(findViolations(size, grid3, [{ a: 0, b: 1, type: "eq" }]).links.has(0)).toBe(true);
    expect(findViolations(size, grid3, [{ a: 0, b: 1, type: "neq" }]).links.size).toBe(0);
  });

  it("does not flag an empty or partial valid grid", () => {
    const v = findViolations(6, new Array(36).fill(EMPTY), []);
    expect(v.lines.size + v.links.size).toBe(0);
  });
});

describe("balance hints", () => {
  for (const tier of TIERS) {
    it(`${tier}: hints alone solve every board, always with a real rule (40 seeds)`, () => {
      for (let i = 0; i < 40; i++) {
        const p = generateBalance({ gameId: "balance", tier, seed: `hint-${i}` });
        const grid = p.givens.slice() as Cell[];
        for (let h = balanceHint(p, grid); h; h = balanceHint(p, grid)) {
          expect(h.kind).toBe("deduce");
          expect(h.value).toBe(p.solution[h.cell]);
          expect(grid[h.cell]).toBe(EMPTY);
          expect(h.reason).not.toMatch(/^Only a/);
          grid[h.cell] = h.value!;
        }
        expect(grid).toEqual(p.solution);
      }
    }, 120_000);
  }

  it("points out a wrong cell before anything else", () => {
    const p = generateBalance({ gameId: "balance", tier: "medium", seed: "hint-wrong" });
    const grid = p.givens.slice() as Cell[];
    const cell = grid.indexOf(EMPTY);
    grid[cell] = p.solution[cell] === DOT ? RING : DOT;
    const h = balanceHint(p, grid)!;
    expect(h.kind).toBe("wrong");
    expect(h.cell).toBe(cell);
  });
});
