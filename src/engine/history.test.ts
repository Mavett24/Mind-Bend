import { describe, expect, it } from "vitest";
import {
  activity,
  emptyHistory,
  exportCode,
  focus,
  gameSummary,
  importCode,
  insightFor,
  merge,
  overall,
  ratingOutcome,
  sanitize,
  skills,
  tierProgress,
  type GameRecord,
  type HistoryData,
} from "./history";
import { START_RATING, updateRating } from "./rating";

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-30T12:00:00Z");
let n = 0;
const rec = (over: Partial<GameRecord>): GameRecord => ({
  id: `r${n++}`,
  at: NOW,
  gameId: "path",
  tier: "medium",
  mode: "practice",
  seed: "abc",
  timeMs: 60_000,
  solved: true,
  outcome: 1,
  ...over,
});
const data = (records: GameRecord[], legacy: HistoryData["legacy"] = {}): HistoryData => ({ version: 2, records, legacy });

describe("gameSummary", () => {
  it("replays the rating from records in time order", () => {
    const records = [rec({ at: NOW - 2000, outcome: 1 }), rec({ at: NOW - 1000, outcome: 0, tier: "hard" })];
    const s = gameSummary(data(records.reverse()), "path", "time");
    const expected = updateRating(updateRating(START_RATING, "medium", 1), "hard", 0);
    expect(s.rating).toBe(expected);
    expect(s.ratingSeries.map((p) => p.rating)).toEqual([START_RATING, updateRating(START_RATING, "medium", 1), expected]);
  });

  it("does not move the rating for daily boards or quits", () => {
    const s = gameSummary(
      data([rec({ mode: "daily", outcome: undefined }), rec({ quit: true, solved: false, outcome: undefined })]),
      "path",
      "time",
    );
    expect(s.rating).toBe(START_RATING);
    expect(s.played).toBe(2);
    expect(s.solved).toBe(1);
    expect(s.quits).toBe(1);
    expect(s.dailyDone.has("2026-10-30")).toBe(true);
  });

  it("keeps bests per tier: lowest time, highest points", () => {
    const t = gameSummary(data([rec({ timeMs: 50_000 }), rec({ timeMs: 40_000 }), rec({ timeMs: 70_000 })]), "path", "time");
    expect(t.best.medium).toBe(40_000);
    const p = gameSummary(
      data([rec({ gameId: "recall", points: 6.2 }), rec({ gameId: "recall", points: 8.1 }), rec({ gameId: "recall", points: 7 })]),
      "recall",
      "points",
    );
    expect(p.best.medium).toBe(8.1);
  });

  it("starts from migrated totals", () => {
    const legacy = { path: { rating: 1200, played: 10, solved: 9, bestMs: { medium: 30_000 }, bestPoints: {}, dailyDone: ["2026-10-29"] } };
    const s = gameSummary(data([rec({ timeMs: 35_000, outcome: 1 })], legacy), "path", "time");
    expect(s.played).toBe(11);
    expect(s.solved).toBe(10);
    expect(s.best.medium).toBe(30_000);
    expect(s.rating).toBe(updateRating(1200, "medium", 1));
    expect(s.dailyDone.has("2026-10-29")).toBe(true);
  });
});

describe("insightFor", () => {
  it("ranks a result among past solves and flags a new best", () => {
    const past = [rec({ timeMs: 50_000, at: NOW - 3000 }), rec({ timeMs: 60_000, at: NOW - 2000 })];
    const mine = rec({ timeMs: 45_000 });
    const i = insightFor(data([...past, mine]), mine, "time");
    expect(i.rank).toBe(1);
    expect(i.of).toBe(3);
    expect(i.newBest).toBe(true);
    expect(i.previousBest).toBe(50_000);
    expect(i.vsRecent).toBeCloseTo((55_000 - 45_000) / 55_000);
    expect(i.ratingAfter).toBeGreaterThan(i.ratingBefore);
  });

  it("is not a new best on the first solve", () => {
    const mine = rec({});
    const i = insightFor(data([mine]), mine, "time");
    expect(i.newBest).toBe(false);
    expect(i.rank).toBe(1);
    expect(i.of).toBe(1);
    expect(i.vsRecent).toBeNull();
  });

  it("detects a promotion to the next tier", () => {
    const legacy = { path: { rating: 995, played: 5, solved: 5, bestMs: {}, bestPoints: {}, dailyDone: [] } };
    const mine = rec({ tier: "hard", outcome: 1 });
    const i = insightFor(data([mine], legacy), mine, "time");
    expect(i.suggested).toBe("medium");
    expect(i.promoted).toBe(true);
  });
});

describe("tierProgress", () => {
  it("measures progress to the next suggested tier", () => {
    expect(tierProgress(1000)).toMatchObject({ current: "medium", next: "hard", nextAt: 1300 });
    expect(tierProgress(1150).progress).toBeCloseTo(1 / 2);
    expect(tierProgress(2000)).toMatchObject({ current: "expert", next: null, progress: 1 });
    expect(tierProgress(500).current).toBe("easy");
  });
});

describe("overall", () => {
  it("counts a streak ending today or yesterday, and the longest run", () => {
    const records = [0, 1, 2, 5, 6].map((d) => rec({ at: NOW - d * DAY }));
    const o = overall(data(records), NOW);
    expect(o.streak).toBe(3);
    expect(o.longestStreak).toBe(3);
    expect(o.today).toBe(1);
    const y = overall(data(records.slice(1)), NOW);
    expect(y.streak).toBe(2);
  });

  it("builds a day by day activity strip", () => {
    const a = activity(data([rec({ at: NOW }), rec({ at: NOW }), rec({ at: NOW - 2 * DAY })]), NOW, 3);
    expect(a.map((d) => d.games)).toEqual([1, 0, 2]);
    expect(a[2].day).toBe("2026-10-30");
  });
});

describe("skills and focus", () => {
  const names = { path: "path", balance: "balance", weave: "weave" };
  it("averages ratings per skill", () => {
    const s = skills([
      { ...gameSummary(emptyHistory(), "path", "time"), rating: 1100, played: 2 },
      { ...gameSummary(emptyHistory(), "balance", "time"), rating: 1300, played: 1 },
    ]);
    expect(s.find((x) => x.skill === "logic")).toMatchObject({ rating: 1200, played: 3 });
    expect(s.find((x) => x.skill === "words")).toMatchObject({ rating: START_RATING, played: 0 });
  });

  it("points at an unplayed game, then the weakest, then the stalest", () => {
    const base = (id: string, rating: number, played: number, lastPlayed: number | null) => ({
      ...gameSummary(emptyHistory(), id, "time"),
      rating,
      played,
      lastPlayed,
    });
    expect(focus([base("path", 1000, 3, NOW), base("weave", 1000, 0, null)], names, NOW)?.gameId).toBe("weave");
    expect(focus([base("path", 1200, 3, NOW), base("balance", 1000, 3, NOW)], names, NOW)?.gameId).toBe("balance");
    const stale = focus([base("path", 1000, 3, NOW), base("balance", 1010, 3, NOW - 4 * DAY)], names, NOW);
    expect(stale?.gameId).toBe("balance");
    expect(stale?.reason).toContain("4 days");
  });
});

describe("transfer", () => {
  it("round-trips through an export code", () => {
    const d = data([rec({}), rec({ gameId: "recall", points: 7.5 })]);
    const back = importCode(exportCode(d));
    expect(back?.records).toHaveLength(2);
    expect(back?.records[1].points).toBe(7.5);
  });

  it("rejects garbage and drops malformed records", () => {
    expect(importCode("hello")).toBeNull();
    expect(importCode("MB2:!!!")).toBeNull();
    const s = sanitize({ records: [rec({}), { id: 1 }, { ...rec({}), tier: "insane" }] });
    expect(s?.records).toHaveLength(1);
  });

  it("merges by id without duplicates", () => {
    const a = rec({ at: NOW - 1000 });
    const b = rec({ at: NOW });
    const merged = merge(data([a]), data([a, b]));
    expect(merged.records.map((r) => r.id)).toEqual([a.id, b.id]);
  });
});

describe("ratingOutcome", () => {
  it("charges 15% per hint, never below 40%", () => {
    expect(ratingOutcome(1, 0)).toBe(1);
    expect(ratingOutcome(1, 2)).toBeCloseTo(0.7);
    expect(ratingOutcome(1, 10)).toBeCloseTo(0.4);
  });
});
