import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TIERS } from "@/engine/difficulty";
import { adjacent8, generateWeaveFrom, isValidTrace, judgeTrace, lengthPlan, wordOf, type WeaveData } from "./engine";
import { createRng } from "@/engine/rng";

const data: WeaveData = JSON.parse(readFileSync(join(process.cwd(), "public/data/weave/words.json"), "utf8"));
const SEEDS_PER_TIER = 100;

const crosses = (size: number, a: number, b: number, c: number, d: number) => {
  // Do diagonal steps a-b and c-d cross in the same 2×2 square?
  const set = new Set([a, b, c, d]);
  if (set.size !== 4) return false;
  const rows = [a, b, c, d].map((x) => Math.floor(x / size));
  const cols = [a, b, c, d].map((x) => x % size);
  const diag = (x: number, y: number) => Math.floor(x / size) !== Math.floor(y / size) && x % size !== y % size;
  return diag(a, b) && diag(c, d) && Math.max(...rows) - Math.min(...rows) === 1 && Math.max(...cols) - Math.min(...cols) === 1;
};

describe("weave generator", () => {
  for (const tier of TIERS) {
    it(`${tier}: hidden words tile the grid exactly, as real non-crossing paths (${SEEDS_PER_TIER} seeds)`, () => {
      for (let i = 0; i < SEEDS_PER_TIER; i++) {
        const p = generateWeaveFrom({ gameId: "weave", tier, seed: `t-${i}` }, data);
        const covered = new Array(p.size * p.size).fill(0);
        const steps: [number, number][] = [];
        for (const w of p.words) {
          expect(isValidTrace(p.size, w.cells)).toBe(true);
          expect(wordOf(p, w.cells)).toBe(w.word);
          expect(data.targets[tier]).toContain(w.word);
          w.cells.forEach((c) => covered[c]++);
          for (let k = 1; k < w.cells.length; k++) steps.push([w.cells[k - 1], w.cells[k]]);
        }
        expect(covered.every((n) => n === 1)).toBe(true);
        expect(new Set(p.words.map((w) => w.word)).size).toBe(p.words.length);
        for (let x = 0; x < steps.length; x++) {
          for (let y = x + 1; y < steps.length; y++) expect(crosses(p.size, ...steps[x], ...steps[y])).toBe(false);
        }
      }
    }, 120_000);
  }

  it("is deterministic per seed", () => {
    const a = generateWeaveFrom({ gameId: "weave", tier: "hard", seed: "same" }, data);
    const b = generateWeaveFrom({ gameId: "weave", tier: "hard", seed: "same" }, data);
    expect(a.letters).toEqual(b.letters);
    expect(a.words).toEqual(b.words);
  });
});

describe("weave length plans", () => {
  it("always sums to the grid size with lengths in range, and terminates", () => {
    const rng = createRng("plans");
    for (const [total, min, max] of [[16, 4, 4], [25, 4, 6], [36, 5, 7], [36, 5, 8], [7, 3, 4]] as const) {
      for (let i = 0; i < 200; i++) {
        const plan = lengthPlan(total, { minLen: min, maxLen: max }, rng);
        expect(plan.reduce((a, b) => a + b, 0)).toBe(total);
        plan.forEach((len) => expect(len >= min && len <= max).toBe(true));
      }
    }
  });
});

describe("weave tracing", () => {
  const p = generateWeaveFrom({ gameId: "weave", tier: "medium", seed: "trace" }, data);

  it("finds a hidden word traced over its cells, and flags repeats", () => {
    const w = p.words[0];
    expect(judgeTrace(p, w.cells, new Set())).toEqual({ kind: "found", index: 0 });
    expect(judgeTrace(p, w.cells, new Set([0]))).toEqual({ kind: "repeat", index: 0 });
  });

  it("rejects short traces, jumps and nonsense", () => {
    expect(judgeTrace(p, p.words[0].cells.slice(0, 2), new Set()).kind).toBe("short");
    const jump = [0, 2, 4];
    expect(adjacent8(p.size, 0, 2)).toBe(false);
    expect(judgeTrace(p, jump, new Set()).kind).toBe("invalid");
  });

  it("recognises real words that aren't hidden in this grid", () => {
    // Search the grid for any 3-to-5 letter trace that spells a valid but non-hidden word.
    let found = false;
    const walk = (cells: number[]) => {
      if (found || cells.length > 5) return;
      if (cells.length >= 3 && judgeTrace(p, cells, new Set()).kind === "elsewhere") {
        found = true;
        return;
      }
      const head = cells[cells.length - 1];
      for (let n = 0; n < p.size * p.size; n++) if (!cells.includes(n) && adjacent8(p.size, head, n)) walk([...cells, n]);
    };
    for (let s = 0; s < p.size * p.size && !found; s++) walk([s]);
    expect(found).toBe(true);
  });
});
