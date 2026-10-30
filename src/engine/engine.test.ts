import { describe, expect, it } from "vitest";
import { createRng, hashString } from "./rng";
import { boardSeed, dailyBoard, isValidSeed, randomSeed, utcDateKey, utcIsoWeekday } from "./seed";
import { dailyTier, suggestTier, TIERS } from "./difficulty";
import { outcomeScore, START_RATING, updateRating } from "./rating";
import { dailyStreak } from "./stats";

describe("rng", () => {
  it("is deterministic for the same seed", () => {
    const a = createRng("path:hard:abc123");
    const b = createRng("path:hard:abc123");
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("differs across seeds", () => {
    expect(createRng("a").next()).not.toEqual(createRng("b").next());
  });

  it("stays in range and covers it", () => {
    const rng = createRng("range");
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const n = rng.int(1, 6);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(6);
      seen.add(n);
    }
    expect(seen.size).toBe(6);
  });

  it("is roughly uniform", () => {
    const rng = createRng("uniform");
    const counts = new Array(10).fill(0);
    const n = 100_000;
    for (let i = 0; i < n; i++) counts[Math.floor(rng.next() * 10)]++;
    for (const c of counts) expect(Math.abs(c - n / 10)).toBeLessThan(n * 0.01);
  });

  it("shuffles without mutating and keeps every element", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = createRng("shuffle").shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort()).toEqual(input);
  });

  it("forks into independent, reproducible streams", () => {
    const a = createRng("root").fork("walls").next();
    const b = createRng("root").fork("walls").next();
    const c = createRng("root").fork("clues").next();
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("hashes to unsigned 32-bit ints", () => {
    const h = hashString("mind bend");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });
});

describe("seeds", () => {
  const friday = new Date("2026-10-30T23:30:00Z");

  it("uses the UTC date for daily boards", () => {
    expect(utcDateKey(friday)).toBe("2026-10-30");
    expect(dailyBoard("path", friday).seed).toBe("daily-2026-10-30");
  });

  it("gives different boards per game for the same daily seed", () => {
    const a = boardSeed(dailyBoard("path", friday));
    const b = boardSeed(dailyBoard("balance", friday));
    expect(a).not.toEqual(b);
  });

  it("ramps daily difficulty through the week", () => {
    expect(utcIsoWeekday(friday)).toBe(5);
    expect(dailyTier(1)).toBe("easy");
    expect(dailyTier(7)).toBe("expert");
  });

  it("generates valid, varied practice seeds", () => {
    const seeds = new Set(Array.from({ length: 200 }, () => randomSeed()));
    expect(seeds.size).toBe(200);
    for (const s of seeds) expect(isValidSeed(s)).toBe(true);
  });

  it("rejects unsafe seeds from URLs", () => {
    expect(isValidSeed("<script>")).toBe(false);
    expect(isValidSeed("")).toBe(false);
    expect(isValidSeed("a".repeat(40))).toBe(false);
  });
});

describe("rating", () => {
  it("rises after a fast win and falls after a loss", () => {
    expect(updateRating(START_RATING, "medium", 1)).toBeGreaterThan(START_RATING);
    expect(updateRating(START_RATING, "medium", 0)).toBeLessThan(START_RATING);
  });

  it("rewards beating harder tiers more", () => {
    const easyWin = updateRating(START_RATING, "easy", 1) - START_RATING;
    const expertWin = updateRating(START_RATING, "expert", 1) - START_RATING;
    expect(expertWin).toBeGreaterThan(easyWin);
  });

  it("scores slow solves between 0.5 and 1", () => {
    expect(outcomeScore(true, 30_000, 60_000)).toBe(1);
    expect(outcomeScore(true, 180_000, 60_000)).toBe(0.5);
    expect(outcomeScore(true, 120_000, 60_000)).toBeCloseTo(0.75);
    expect(outcomeScore(false, 10_000, 60_000)).toBe(0);
  });

  it("suggests a tier for every rating", () => {
    expect(suggestTier(START_RATING)).toBe("medium");
    expect(suggestTier(400)).toBe("easy");
    expect(suggestTier(2000)).toBe("expert");
    for (let r = 400; r <= 2400; r += 50) expect(TIERS).toContain(suggestTier(r));
  });
});

describe("daily streak", () => {
  it("counts consecutive days and survives until today is played", () => {
    const done = ["2026-10-27", "2026-10-28", "2026-10-29"];
    expect(dailyStreak(done, "2026-10-29")).toBe(3);
    expect(dailyStreak(done, "2026-10-30")).toBe(3);
    expect(dailyStreak(done, "2026-10-31")).toBe(0);
    expect(dailyStreak([...done, "2026-10-30"], "2026-10-30")).toBe(4);
  });
});
