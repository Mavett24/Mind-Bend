import { describe, expect, it } from "vitest";
import { TIERS } from "@/engine/difficulty";
import {
  applyGesture,
  blockersOf,
  clampedCell,
  generateBlocks,
  isSolved,
  matchClue,
  rectCells,
  rectFromCorners,
  shapeOf,
  solveBlocks,
  type BlocksPuzzle,
  type Placed,
  verdict,
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

describe("blocks gestures", () => {
  const p = generateBlocks({ gameId: "blocks", tier: "easy", seed: "gestures" });
  const cellsOf = (i: number) => rectCells(p.solution[i], p.size);

  it("ignores a tap on an empty cell", () => {
    const r = applyGesture(p, [], 0, 0, false);
    expect(r.placed).toHaveLength(0);
    expect(r.removed).toBe(0);
  });

  it("places a dragged rectangle and removes it with a tap", () => {
    const cells = cellsOf(0);
    const drawn = applyGesture(p, [], cells[cells.length - 1], cells[0], true);
    expect(drawn.placed).toHaveLength(1);
    expect(drawn.placed[0].clue).toBe(0);
    const tapped = applyGesture(p, drawn.placed, cells[0], cells[0], false);
    expect(tapped.placed).toHaveLength(0);
    expect(tapped.removed).toBe(1);
  });

  it("treats a drag that returns to its start cell as a tap", () => {
    const cells = cellsOf(0);
    const drawn = applyGesture(p, [], cells[0], cells[cells.length - 1], true);
    expect(applyGesture(p, drawn.placed, cells[0], cells[0], true).placed).toHaveLength(0);
  });

  /** Draws solution rectangle i, corner to corner. */
  const drawSolution = (placed: Placed[], i: number) => {
    const cells = cellsOf(i);
    return applyGesture(p, placed, cells[0], cells[cells.length - 1], true);
  };

  it("never erases a rectangle that fits its clue when a drag crosses it", () => {
    let placed: Placed[] = [];
    for (let i = 0; i < p.solution.length; i++) if (cellsOf(i).length > 1) placed = drawSolution(placed, i).placed;
    expect(placed.every((q) => q.clue >= 0)).toBe(true);
    // A drag across the whole board touches every rectangle: nothing changes.
    const sweep = applyGesture(p, placed, 0, p.size * p.size - 1, true);
    expect(sweep.placed).toEqual(placed);
    expect(sweep.removed).toBe(0);
    expect(sweep.blocked).toHaveLength(placed.length);
    // Every two-cell drag anywhere on the board leaves the good rectangles alone.
    for (let a = 0; a < p.size * p.size; a++) {
      for (const b of [a + 1, a + p.size]) {
        if (b >= p.size * p.size || (b === a + 1 && b % p.size === 0)) continue;
        expect(applyGesture(p, placed, a, b, true).placed).toEqual(placed);
      }
    }
  });

  it("replaces rectangles that don't fit a clue", () => {
    const wrong = applyGesture(p, [], 0, p.size * p.size - 1, true).placed;
    expect(wrong[0].clue).toBe(-1);
    const redrawn = drawSolution(wrong, 0);
    expect(redrawn.removed).toBe(1);
    expect(redrawn.blocked).toEqual([]);
    expect(redrawn.placed).toEqual([{ rect: p.solution[0], clue: 0 }]);
  });

  it("removes a good rectangle with a tap, then lets a drag through", () => {
    const placed = drawSolution([], 0).placed;
    const across = { r: p.solution[0].r, c: 0, h: 1, w: p.size };
    expect(blockersOf(placed, across)).toHaveLength(1);
    const cleared = applyGesture(p, placed, cellsOf(0)[0], cellsOf(0)[0], false).placed;
    expect(blockersOf(cleared, across)).toHaveLength(0);
  });

  it("explains why a rectangle does or doesn't fit", () => {
    p.solution.forEach((rect, i) => expect(verdict(rect, p)).toEqual({ kind: "fits", clue: i }));
    expect(verdict({ r: 0, c: 0, h: p.size, w: p.size }, p).kind).toBe("crowded");
    const empty = p.solution.find((r) => r.h * r.w >= 2)!;
    const i = p.solution.indexOf(empty);
    const off = rectCells(empty, p.size).filter((c) => c !== p.clues[i].cell)[0];
    expect(verdict({ r: Math.floor(off / p.size), c: off % p.size, h: 1, w: 1 }, p)).toEqual({ kind: "empty" });
    const one = { r: Math.floor(p.clues[i].cell / p.size), c: p.clues[i].cell % p.size, h: 1, w: 1 };
    expect(verdict(one, p)).toEqual({ kind: "area", clue: i, area: 1, need: p.clues[i].area });
    // A hand-made board: one wide 3 in the corner. Standing it up is the right area, wrong shape.
    const tiny: BlocksPuzzle = { size: 3, clues: [{ cell: 0, area: 3, shape: "wide", color: 0 }], solution: [] };
    expect(verdict({ r: 0, c: 0, h: 3, w: 1 }, tiny)).toEqual({ kind: "shape", clue: 0, need: "wide" });
    expect(verdict({ r: 0, c: 0, h: 1, w: 3 }, tiny)).toEqual({ kind: "fits", clue: 0 });
    expect(verdict({ r: 0, c: 0, h: 2, w: 2 }, tiny)).toEqual({ kind: "area", clue: 0, area: 4, need: 3 });
  });

  it("clamps points outside the board to its edge", () => {
    expect(clampedCell(5, -2, -3)).toBe(0);
    expect(clampedCell(5, 9, 9)).toBe(24);
    expect(clampedCell(5, 2.5, 7)).toBe(22);
  });

  it("solves when every solution rectangle is drawn, in any order or direction", () => {
    let placed: ReturnType<typeof applyGesture>["placed"] = [];
    [...p.solution.keys()].reverse().forEach((i) => {
      const cells = cellsOf(i);
      if (cells.length === 1) return;
      placed = applyGesture(p, placed, cells[cells.length - 1], cells[0], true).placed;
    });
    expect(isSolved(p, placed)).toBe(true);
  });
});
