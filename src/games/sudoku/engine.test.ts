import { describe, expect, it } from "vitest";
import { TIERS } from "@/engine/difficulty";
import { conflicts, countSolutions, generateSudoku, geometry, isSolved, solveLogic, SUDOKU_GIVENS, sudokuHint, type SudokuPuzzle } from "./engine";

const SEEDS: Record<(typeof TIERS)[number], number> = { easy: 100, medium: 100, hard: 100, expert: 100 };

function checkSolutionIsValid(p: SudokuPuzzle) {
  const g = geometry(p.size);
  for (const unit of g.units) expect(new Set(unit.map((c) => p.solution[c])).size).toBe(p.size);
  p.givens.forEach((v, c) => {
    if (v) expect(v).toBe(p.solution[c]);
  });
}

describe("sudoku generator", () => {
  for (const tier of TIERS) {
    it(`${tier}: 6×6, exactly ${SUDOKU_GIVENS[tier]} givens, unique and solvable with singles (${SEEDS[tier]} seeds)`, () => {
      for (let i = 0; i < SEEDS[tier]; i++) {
        const p = generateSudoku({ gameId: "sudoku", tier, seed: `t-${i}` });
        expect(p.size).toBe(6);
        checkSolutionIsValid(p);
        expect(p.givens.filter(Boolean).length).toBe(SUDOKU_GIVENS[tier]);
        expect(countSolutions(p.size, p.givens)).toBe(1);
        const logic = solveLogic(p.size, p.givens, 1);
        expect(logic.solved).toBe(true);
        expect(logic.values).toEqual(p.solution);
      }
    }, 120_000);
  }

  it("gives fewer numbers as tiers rise", () => {
    expect(SUDOKU_GIVENS.easy).toBeGreaterThan(SUDOKU_GIVENS.medium);
    expect(SUDOKU_GIVENS.medium).toBeGreaterThan(SUDOKU_GIVENS.hard);
    expect(SUDOKU_GIVENS.hard).toBeGreaterThan(SUDOKU_GIVENS.expert);
  });

  it("is deterministic per seed", () => {
    const a = generateSudoku({ gameId: "sudoku", tier: "expert", seed: "same" });
    expect(generateSudoku({ gameId: "sudoku", tier: "expert", seed: "same" })).toEqual(a);
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
      for (let i = 0; i < 20; i++) {
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

  it("points out a wrong number first", () => {
    const p = generateSudoku({ gameId: "sudoku", tier: "medium", seed: "wrong" });
    const grid = p.givens.slice();
    const cell = grid.indexOf(0);
    grid[cell] = (p.solution[cell] % p.size) + 1;
    const h = sudokuHint(p, grid)!;
    expect(h.kind).toBe("wrong");
    expect(h.cell).toBe(cell);
  });
});
