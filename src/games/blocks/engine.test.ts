import { describe, expect, it } from "vitest";
import { TIERS } from "@/engine/difficulty";
import {
  generateBlocks,
  isSolved,
  matchClue,
  rectCells,
  rectFromCorners,
  shapeOf,
  solveBlocks,
  type BlocksPuzzle,
} from "./engine";

const SEEDS_PER_TIER = 100;

function checkSolutionIsValid(p: BlocksPuzzle) {
  const covered = new Array(p.size * p.size).fill(0);
  p.solution.forEach((rect, i) => {
    const cells = rectCells(rect, p.size);
    cells.forEach((c) => covered[c]++);
    expect(cells).toContain(p.clues[i].cell);
    expect(rect.h * rect.w).toBe(p.clues[i].area);
    if (p.clues[i].shape !== "any") expect(shapeOf(rect)).toBe(p.clues[i].shape);
    // exactly one clue per rectangle
    expect(p.clues.filter((c) => cells.includes(c.cell))).toHaveLength(1);
  });
  expect(covered.every((n) => n === 1)).toBe(true);
}

describe("blocks generator", () => {
  for (const tier of TIERS) {
    it(`${tier}: every board has exactly one solution (${SEEDS_PER_TIER} seeds)`, () => {
      for (let i = 0; i < SEEDS_PER_TIER; i++) {
        const p = generateBlocks({ gameId: "blocks", tier, seed: `test-${i}` });
        checkSolutionIsValid(p);
        const sols = solveBlocks(p.size, p.clues, 2);
        expect(sols).toHaveLength(1);
        expect(sols[0]).toEqual(p.solution);
      }
    }, 120_000);
  }

  it("never gives touching rectangles the same colour", () => {
    for (let i = 0; i < 30; i++) {
      const p = generateBlocks({ gameId: "blocks", tier: "expert", seed: `colour-${i}` });
      const owner = new Array(p.size * p.size);
      p.solution.forEach((rect, ri) => rectCells(rect, p.size).forEach((c) => (owner[c] = ri)));
      for (let c = 0; c < p.size * p.size; c++) {
        for (const n of [c % p.size < p.size - 1 ? c + 1 : -1, c + p.size < p.size * p.size ? c + p.size : -1]) {
          if (n >= 0 && owner[n] !== owner[c]) expect(p.clues[owner[n]].color).not.toBe(p.clues[owner[c]].color);
        }
      }
    }
  });

  it("hides more shape hints on harder tiers", () => {
    const hiddenShare = (tier: (typeof TIERS)[number]) => {
      let hidden = 0;
      let total = 0;
      for (let i = 0; i < 20; i++) {
        const p = generateBlocks({ gameId: "blocks", tier, seed: `h-${i}` });
        hidden += p.clues.filter((c) => c.shape === "any").length;
        total += p.clues.length;
      }
      return hidden / total;
    };
    expect(hiddenShare("easy")).toBe(0);
    expect(hiddenShare("expert")).toBeGreaterThan(hiddenShare("medium"));
  });

  it("is deterministic per seed", () => {
    const a = generateBlocks({ gameId: "blocks", tier: "hard", seed: "same" });
    expect(generateBlocks({ gameId: "blocks", tier: "hard", seed: "same" })).toEqual(a);
  });
});

describe("blocks player rules", () => {
  const p = generateBlocks({ gameId: "blocks", tier: "medium", seed: "rules" });

  it("matches drawn rectangles to clues and recognises a full solve", () => {
    const placed = p.solution.map((rect, i) => {
      const cells = rectCells(rect, p.size);
      const drawn = rectFromCorners(p.size, cells[cells.length - 1], cells[0]); // drawn bottom-right to top-left
      expect(matchClue(drawn, p)).toBe(i);
      return { rect: drawn, clue: i };
    });
    expect(isSolved(p, placed)).toBe(true);
    expect(isSolved(p, placed.slice(1))).toBe(false);
  });

  it("rejects a rectangle holding two clues or the wrong area", () => {
    const whole = { r: 0, c: 0, h: p.size, w: p.size };
    expect(matchClue(whole, p)).toBe(-1);
    const first = p.solution[0];
    const shrunk = { ...first, w: Math.max(1, first.w - 1), h: first.h };
    if (shrunk.w * shrunk.h !== p.clues[0].area && rectCells(shrunk, p.size).includes(p.clues[0].cell)) {
      expect(matchClue(shrunk, p)).toBe(-1);
    }
  });
});
