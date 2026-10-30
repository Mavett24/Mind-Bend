import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TIERS } from "@/engine/difficulty";
import { adjacent4, generateWeaveFrom, isBlocked, isValidTrace, judgeTrace, slotOrder, wordOf, type WeaveData } from "./engine";

const data: WeaveData = JSON.parse(readFileSync(join(process.cwd(), "public/data/weave/words.json"), "utf8"));
const SEEDS_PER_TIER = 100;

describe("weave generator", () => {
  for (const tier of TIERS) {
    it(`${tier}: words cover every letter once, as up/down/left/right paths (${SEEDS_PER_TIER} seeds)`, () => {
      for (let i = 0; i < SEEDS_PER_TIER; i++) {
        const p = generateWeaveFrom({ gameId: "weave", tier, seed: `t-${i}` }, data);
        const covered = new Array(p.size * p.size).fill(0);
        for (const w of p.words) {
          expect(isValidTrace(p, w.cells)).toBe(true);
          for (let k = 1; k < w.cells.length; k++) expect(adjacent4(p.size, w.cells[k - 1], w.cells[k])).toBe(true);
          expect(wordOf(p, w.cells)).toBe(w.word);
          expect(data.targets[tier]).toContain(w.word);
          w.cells.forEach((c) => covered[c]++);
        }
        for (let c = 0; c < p.size * p.size; c++) expect(covered[c]).toBe(isBlocked(p, c) ? 0 : 1);
        expect(new Set(p.words.map((w) => w.word)).size).toBe(p.words.length);
        const blocked = p.letters.filter((l) => l === "").length;
        expect(blocked).toBeGreaterThan(0);
        expect(blocked).toBeLessThanOrEqual(6);
        for (let c = 0; c < p.size * p.size; c++) {
          // Empty tiles are scattered: never two side by side.
          if (isBlocked(p, c)) {
            if (c % p.size < p.size - 1) expect(isBlocked(p, c + 1)).toBe(false);
            if (c + p.size < p.size * p.size) expect(isBlocked(p, c + p.size)).toBe(false);
          }
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

  it("orders slots shortest first", () => {
    const p = generateWeaveFrom({ gameId: "weave", tier: "hard", seed: "slots" }, data);
    const lengths = slotOrder(p).map((i) => p.words[i].word.length);
    expect(lengths).toEqual([...lengths].sort((a, b) => a - b));
  });
});

describe("weave tracing", () => {
  const p = generateWeaveFrom({ gameId: "weave", tier: "medium", seed: "trace" }, data);

  it("finds a hidden word traced over its cells, and flags repeats", () => {
    const w = p.words[0];
    expect(judgeTrace(p, w.cells, new Set())).toEqual({ kind: "found", index: 0 });
    expect(judgeTrace(p, w.cells, new Set([0]))).toEqual({ kind: "repeat", index: 0 });
  });

  it("rejects diagonal steps, short traces and blocked tiles", () => {
    expect(adjacent4(5, 0, 6)).toBe(false); // diagonal
    expect(isValidTrace(p, [0, 6, 12])).toBe(false);
    expect(judgeTrace(p, p.words[0].cells.slice(0, 2), new Set()).kind).toBe("short");
    const blocked = p.letters.findIndex((l) => l === "");
    expect(isValidTrace(p, [blocked])).toBe(false);
  });
});
