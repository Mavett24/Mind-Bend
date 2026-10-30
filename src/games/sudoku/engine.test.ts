import { describe, expect, it } from "vitest";
import { TIERS } from "@/engine/difficulty";
import { conflicts, countSolutions, generateSudoku, geometry, isSolved, solveLogic, sudokuHint, type SudokuPuzzle } from "./engine";

const SEEDS: Record<(typeof TIERS)[number], number> = { easy: 60, medium: 60, hard: 30, expert: 20 };

function checkSolutionIsValid(p: SudokuPuzzle) {
  const g = geometry(p.size);
  for (const unit of g.units) expect(new Set(unit.map((c) => p.solution[c])).size).toBe(p.size);
  p.givens.forEach((v, c) => {
    if (v) expect(v).toBe(p.solution[c]);
  });
}

describe("sudoku generator", () => {
  for (const tier of TIERS) {
    it(`${tier}: unique, logic-solvable boards that need the tier's techniques (${SEEDS[tier]} seeds)`, () => {
      for (let i = 0; i < SEEDS[tier]; i++) {
        const p = generateSudoku({ gameId: "sudoku", tier, seed: `t-${i}` });
        checkSolutionIsValid(p);
        expect(countSolutions(p.size, p.givens)).toBe(1);
        const allowed = tier === "expert" ? 3 : tier === "hard" ? 2 : 1;
        const logic = solveLogic(p.size, p.givens, allowed);
        expect(logic.solved).toBe(true);
        expect(logic.values).toEqual(p.solution);
        // Harder tiers can't be finished with singles alone.
        if (tier === "hard" || tier === "expert") expect(solveLogic(p.size, p.givens, 1).solved).toBe(false);
        if (tier === "expert") expect(p.advanced).toBeGreaterThanOrEqual(3);
      }
    }, 300_000);
  }

  it("uses 6×6 for easy and 9×9 above, with fewer givens as tiers rise", () => {
    const avg = (tier: (typeof TIERS)[number]) => {
      let sum = 0;
      for (let i = 0; i < 10; i++) sum += generateSudoku({ gameId: "sudoku", tier, seed: `g-${i}` }).givens.filter(Boolean).length;
      return sum / 10;
    };
    expect(generateSudoku({ gameId: "sudoku", tier: "easy", seed: "x" }).size).toBe(6);
    expect(generateSudoku({ gameId: "sudoku", tier: "medium", seed: "x" }).size).toBe(9);
    expect(avg("medium")).toBeGreaterThan(avg("expert"));
  }, 120_000);

  it("is deterministic per seed", () => {
    const a = generateSudoku({ gameId: "sudoku", tier: "hard", seed: "same" });
    expect(generateSudoku({ gameId: "sudoku", tier: "hard", seed: "same" })).toEqual(a);
  });
});

describe("sudoku rules", () => {
  it("flags repeated numbers in a row, column or box", () => {
    const grid = new Array(81).fill(0);
    grid[0] = 5;
    grid[8] = 5; // same row
    grid[80] = 3;
    expect([...conflicts(9, grid)].sort((a, b) => a - b)).toEqual([0, 8]);
    grid[8] = 0;
    grid[10] = 5; // same box as cell 0
    expect(conflicts(9, grid).has(10)).toBe(true);
  });

  it("knows when a grid is solved", () => {
    const p = generateSudoku({ gameId: "sudoku", tier: "easy", seed: "s" });
    expect(isSolved(p, p.solution)).toBe(true);
    expect(isSolved(p, p.givens)).toBe(false);
  });
});

describe("sudoku hints", () => {
  for (const tier of TIERS) {
    it(`${tier}: hints alone solve the board, each with a real reason`, () => {
      for (let i = 0; i < (tier === "expert" ? 6 : 12); i++) {
        const p = generateSudoku({ gameId: "sudoku", tier, seed: `h-${i}` });
        const grid = p.givens.slice();
        for (let h = sudokuHint(p, grid); h; h = sudokuHint(p, grid)) {
          expect(h.kind).toBe("place");
          expect(h.digit).toBe(p.solution[h.cell]);
          expect(grid[h.cell]).toBe(0);
          expect(h.reason).not.toMatch(/^This one is/);
          grid[h.cell] = h.digit!;
        }
        expect(grid).toEqual(p.solution);
      }
    }, 300_000);
  }

  it("explains advanced steps on hard boards", () => {
    const p = generateSudoku({ gameId: "sudoku", tier: "hard", seed: "adv" });
    const grid = p.givens.slice();
    const reasons: string[] = [];
    for (let h = sudokuHint(p, grid); h; h = sudokuHint(p, grid)) {
      reasons.push(h.reason);
      grid[h.cell] = h.digit!;
    }
    expect(reasons.some((r) => r.includes("That leaves"))).toBe(true);
  }, 60_000);

  it("points out a wrong number first", () => {
    const p = generateSudoku({ gameId: "sudoku", tier: "medium", seed: "wrong" });
    const grid = p.givens.slice();
    const cell = grid.indexOf(0);
    grid[cell] = (p.solution[cell] % 9) + 1;
    const h = sudokuHint(p, grid)!;
    expect(h.kind).toBe("wrong");
    expect(h.cell).toBe(cell);
  });
});
