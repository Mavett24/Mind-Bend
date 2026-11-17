import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TIERS } from "@/engine/difficulty";
import {
  answerPoints,
  buildHigherLower,
  buildQuiz,
  CATEGORIES,
  countdownParts,
  formatValue,
  QUESTIONS_PER_GAME,
  totalPoints,
  type BankQuestion,
  type HLCategory,
} from "./engine";

const read = <T,>(path: string): T => JSON.parse(readFileSync(join(process.cwd(), "public/data/trivia", path), "utf8"));
const hl = read<HLCategory[]>("higher-lower.json");

describe("trivia data", () => {
  it("has a question file for every category, all well formed", () => {
    for (const { id } of CATEGORIES) {
      const bank = read<BankQuestion[]>(`${id}.json`);
      expect(bank.length).toBeGreaterThan(200);
      for (const q of bank) {
        expect(q.o).toHaveLength(4);
        expect(q.a).toBeGreaterThanOrEqual(0);
        expect(q.a).toBeLessThan(4);
        expect(new Set(q.o).size).toBe(4);
        expect(q.q.length).toBeLessThanOrEqual(170);
      }
    }
  });

  it("has four higher-or-lower categories with sources and positive values", () => {
    expect(hl.map((c) => c.id).sort()).toEqual(["area", "cities", "gdp", "population"]);
    for (const c of hl) {
      expect(c.source.length).toBeGreaterThan(3);
      expect(c.items.length).toBeGreaterThan(100);
      c.items.forEach((it) => expect(it.value).toBeGreaterThan(0));
    }
  });
});

describe("categories mode", () => {
  const bank = read<BankQuestion[]>("science.json");
  for (const tier of TIERS) {
    it(`${tier}: ten questions with the right answer among the options`, () => {
      for (let s = 0; s < 30; s++) {
        const quiz = buildQuiz(bank, { gameId: "trivia", tier, seed: `q-${s}` }, "science");
        expect(quiz).toHaveLength(QUESTIONS_PER_GAME);
        for (const q of quiz) {
          expect(q.options).toHaveLength(tier === "easy" ? 3 : 4);
          const original = bank.find((b) => b.q === q.q)!;
          expect(q.options[q.answer]).toBe(original.o[original.a]);
        }
        expect(new Set(quiz.map((q) => q.q)).size).toBe(QUESTIONS_PER_GAME);
      }
    });
  }

  it("is deterministic per seed and category", () => {
    const key = { gameId: "trivia", tier: "medium" as const, seed: "same" };
    expect(buildQuiz(bank, key, "science")).toEqual(buildQuiz(bank, key, "science"));
  });
});

describe("higher or lower mode", () => {
  const bands = { easy: [3, Infinity], medium: [1.5, 3], hard: [1.15, 1.5], expert: [1.02, 1.15] } as const;
  for (const tier of TIERS) {
    it(`${tier}: ten pairs inside the tier's ratio band, correct answers, no repeats`, () => {
      for (let s = 0; s < 30; s++) {
        const pairs = buildHigherLower(hl, { gameId: "trivia", tier, seed: `h-${s}` });
        expect(pairs).toHaveLength(QUESTIONS_PER_GAME);
        const names = new Set<string>();
        for (const p of pairs) {
          const ratio = Math.max(p.left.value, p.right.value) / Math.min(p.left.value, p.right.value);
          expect(ratio).toBeGreaterThanOrEqual(bands[tier][0]);
          expect(ratio).toBeLessThan(bands[tier][1]);
          expect(p.answer).toBe(p.left.value > p.right.value ? 0 : 1);
          for (const n of [p.left.name, p.right.name]) {
            expect(names.has(`${p.category}:${n}`)).toBe(false);
            names.add(`${p.category}:${n}`);
          }
        }
        expect(new Set(pairs.map((p) => p.category)).size).toBe(4);
      }
    });
  }
});

describe("trivia scoring and formatting", () => {
  it("scores 0.7 to 1.0 per right answer depending on speed", () => {
    expect(answerPoints(false, 9000, 10000)).toBe(0);
    expect(answerPoints(true, 0, 10000)).toBe(0);
    expect(answerPoints(true, 10000, 10000)).toBe(1);
    expect(answerPoints(true, 5000, 10000)).toBe(0.85);
    expect(totalPoints(new Array(10).fill(1))).toBe(10);
  });

  it("formats values readably", () => {
    expect(formatValue(1_428_627_663, "people")).toBe("1.4 billion people");
    expect(formatValue(36_200_000, "people")).toBe("36.2 million people");
    expect(formatValue(27_360_000_000_000, "US$ GDP")).toBe("$27.4 trillion");
    expect(formatValue(41_543, "km²")).toBe("41,543 km²");
    expect(formatValue(512_000, "people")).toBe("512,000 people");
  });
});

describe("countdown readout", () => {
  it("rounds up to the tenth so a fresh question shows its full time", () => {
    expect(countdownParts(15000)).toEqual(["15", ".0"]);
    expect(countdownParts(14999)).toEqual(["15", ".0"]);
    expect(countdownParts(14901)).toEqual(["15", ".0"]);
    expect(countdownParts(14900)).toEqual(["14", ".9"]);
    expect(countdownParts(8050)).toEqual(["8", ".1"]);
  });
  it("only reads zero once time is up, and never goes negative", () => {
    expect(countdownParts(1)).toEqual(["0", ".1"]);
    expect(countdownParts(0)).toEqual(["0", ".0"]);
    expect(countdownParts(-250)).toEqual(["0", ".0"]);
  });
});

describe("higher or lower flags (D-064)", () => {
  it("gives every country and city a flag that exists", async () => {
    const { readFileSync, existsSync } = await import("node:fs");
    const decks = JSON.parse(readFileSync("public/data/trivia/higher-lower.json", "utf8")) as { items: { name: string; code?: string }[] }[];
    for (const deck of decks) {
      for (const item of deck.items) {
        expect(item.code, item.name).toMatch(/^[a-z]{2}$/);
        expect(existsSync(`public/flags/${item.code}.webp`), item.code).toBe(true);
      }
    }
  });
});
