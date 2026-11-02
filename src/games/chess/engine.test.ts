import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createRng } from "@/engine/rng";
import { emptyHistory, gameSummary, type GameRecord } from "@/engine/history";
import { applyPuzzle, puzzleDelta, puzzleK } from "@/engine/puzzle-rating";
import {
  bandOf,
  bandsAround,
  DAILY_TARGETS,
  fromTuple,
  isComplete,
  judgeMove,
  MAX_SPEED_BONUS,
  parsePuzzleSeed,
  parseUci,
  pickPuzzle,
  playerColor,
  playerMoves,
  positionAt,
  practiceTarget,
  puzzleSeed,
  speedBonus,
  targetMs,
  themeLabels,
  type ChessPuzzle,
  type PuzzleTuple,
} from "./engine";

const DIR = join(process.cwd(), "public/data/chess");
const index = JSON.parse(readFileSync(join(DIR, "index.json"), "utf8")) as { band: number; bands: { band: number; count: number }[] };
const all: ChessPuzzle[] = index.bands.flatMap(({ band }) => (JSON.parse(readFileSync(join(DIR, `${band}.json`), "utf8")) as PuzzleTuple[]).map(fromTuple));

describe("chess puzzle set", () => {
  it("has an index entry for every band file and enough puzzles across ratings", () => {
    const files = readdirSync(DIR).filter((f) => /^\d+\.json$/.test(f)).map((f) => Number(f.slice(0, -5)));
    expect(files.sort((a, b) => a - b)).toEqual(index.bands.map((b) => b.band));
    expect(all.length).toBeGreaterThan(10_000);
    for (const target of [...DAILY_TARGETS, 800, 2400]) {
      expect(all.filter((p) => Math.abs(p.rating - target) <= 100).length, `near ${target}`).toBeGreaterThan(150);
    }
  });

  it("every puzzle sits in its band, has unique id, and its solution plays legally and is judged correct", () => {
    const ids = new Set<string>();
    for (const p of all) {
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      expect(p.moves.length % 2).toBe(0);
      expect(playerMoves(p)).toBeGreaterThanOrEqual(1);
      const file = index.bands.find((b) => b.band === bandOf(p.rating));
      expect(file, p.id).toBeDefined();
      for (let ply = 1; ply < p.moves.length; ply += 2) {
        const verdict = judgeMove(p, ply, parseUci(p.moves[ply]));
        expect(["correct", "mate"], `${p.id} ply ${ply}`).toContain(verdict);
      }
      expect(isComplete(p, p.moves.length)).toBe(true);
    }
  }, 120_000);
});

describe("judging moves", () => {
  // Back rank: after ...b6, both Qd8 and Ra8 mate. The line says Qd8; Ra8 must count too.
  const twoMates: ChessPuzzle = {
    id: "test1",
    fen: "6k1/1p3ppp/8/8/8/8/5PPP/R2Q2K1 b - - 0 1",
    moves: ["b7b6", "d1d8"],
    rating: 1000,
    themes: ["mateIn1", "backRankMate"],
  };

  it("accepts the solution, any other mate, and rejects the rest", () => {
    expect(playerColor(twoMates)).toBe("w");
    expect(judgeMove(twoMates, 1, parseUci("d1d8"))).toBe("correct");
    expect(judgeMove(twoMates, 1, parseUci("a1a8"))).toBe("mate");
    expect(judgeMove(twoMates, 1, parseUci("d1d7"))).toBe("wrong");
    expect(judgeMove(twoMates, 1, parseUci("a1b3"))).toBe("illegal");
  });

  it("plays the setup move before the player's first move", () => {
    expect(positionAt(twoMates, 1).turn()).toBe("w");
    expect(positionAt(twoMates, 1).get("b6")?.type).toBe("p");
  });

  it("names themes plainly, motifs before the phase of the game", () => {
    expect(themeLabels({ ...twoMates, themes: ["endgame", "fork", "short", "mateIn2"] })).toEqual(["fork", "mate in 2", "endgame"]);
  });
});

describe("picking puzzles", () => {
  const pool = all.filter((p) => Math.abs(p.rating - 1500) < 300);

  it("is deterministic for a seed and stays near the target", () => {
    for (let i = 0; i < 200; i++) {
      const a = pickPuzzle(pool, 1500, createRng(`pick-${i}`));
      const b = pickPuzzle(pool, 1500, createRng(`pick-${i}`));
      expect(a.id).toBe(b.id);
      expect(Math.abs(a.rating - 1500)).toBeLessThan(60);
    }
  });

  it("skips puzzles you have already seen", () => {
    const seen = new Set(pool.filter((p) => Math.abs(p.rating - 1500) < 40).map((p) => p.id));
    const p = pickPuzzle(pool, 1500, createRng("seen"), seen);
    expect(seen.has(p.id)).toBe(false);
  });

  it("practice tiers move the target relative to your rating", () => {
    const rng = createRng("tiers");
    expect(practiceTarget(1500, "easy", rng)).toBeLessThan(1300);
    expect(practiceTarget(1500, "expert", rng)).toBeGreaterThan(1800);
    expect(practiceTarget(100, "easy", rng)).toBe(500);
  });

  it("loads the band that holds the target, and its neighbour when the target is near an edge", () => {
    const bands = index.bands.map((b) => b.band);
    expect(bandsAround(1500, bands)).toEqual([1200, 1400, 1600]);
    expect(bandsAround(5000, bands)).toEqual([Math.max(...bands)]);
  });

  it("round-trips a puzzle through a challenge seed", () => {
    const p = all[123];
    expect(parsePuzzleSeed(puzzleSeed(p))).toEqual({ band: bandOf(p.rating), id: p.id });
    expect(parsePuzzleSeed("k3f9x2")).toBeNull();
  });
});

describe("speed bonus", () => {
  it("target time grows with puzzle rating and line length", () => {
    expect(targetMs(1000, 1)).toBe(18_000);
    expect(targetMs(2000, 1)).toBe(32_000);
    expect(targetMs(2000, 3)).toBeGreaterThan(targetMs(2000, 1));
  });

  it("is full at half the target, fades to zero at twice the target", () => {
    const t = 20_000;
    expect(speedBonus(5_000, t)).toBe(MAX_SPEED_BONUS);
    expect(speedBonus(10_000, t)).toBe(MAX_SPEED_BONUS);
    expect(speedBonus(20_000, t)).toBe(3);
    expect(speedBonus(40_000, t)).toBe(0);
    expect(speedBonus(90_000, t)).toBe(0);
  });
});

describe("puzzle rating", () => {
  const settled = 40;
  it("an even puzzle is worth half of K either way", () => {
    expect(puzzleK(settled)).toBe(24);
    expect(puzzleDelta(1500, { solved: true, puzzleRating: 1500, hints: 0, bonus: 0 }, settled)).toBe(12);
    expect(puzzleDelta(1500, { solved: false, puzzleRating: 1500, hints: 0, bonus: 0 }, settled)).toBe(-12);
  });

  it("harder puzzles pay more and cost less", () => {
    const up = puzzleDelta(1500, { solved: true, puzzleRating: 1900, hints: 0, bonus: 0 }, settled);
    const down = puzzleDelta(1500, { solved: false, puzzleRating: 1900, hints: 0, bonus: 0 }, settled);
    expect(up).toBeGreaterThan(18);
    expect(down).toBeGreaterThan(-6);
  });

  it("a piece hint halves the win, a move hint keeps none, and hints drop the speed bonus", () => {
    const clean = puzzleDelta(1500, { solved: true, puzzleRating: 1500, hints: 0, bonus: 4 }, settled);
    expect(clean).toBe(16);
    expect(puzzleDelta(1500, { solved: true, puzzleRating: 1500, hints: 1, bonus: 4 }, settled)).toBe(6);
    expect(puzzleDelta(1500, { solved: true, puzzleRating: 1500, hints: 2, bonus: 4 }, settled)).toBe(0);
  });

  it("a clean solve always gains, even far below your rating", () => {
    expect(puzzleDelta(2500, { solved: true, puzzleRating: 700, hints: 0, bonus: 0 }, settled)).toBe(1);
  });

  it("swings big while provisional", () => {
    expect(puzzleDelta(1200, { solved: true, puzzleRating: 1200, hints: 0, bonus: 0 }, 0)).toBe(32);
    expect(applyPuzzle(110, { solved: false, puzzleRating: 110, hints: 0, bonus: 0 }, 0)).toBe(100);
  });
});

describe("chess in history", () => {
  const rec = (i: number, over: Partial<GameRecord>): GameRecord => ({
    id: `r${i}`,
    at: Date.parse("2026-11-02T10:00:00Z") + i * 60_000,
    gameId: "chess",
    tier: "medium",
    mode: "practice",
    seed: `1400-p${i}`,
    timeMs: 30_000,
    solved: true,
    outcome: 1,
    opponent: 1200,
    ...over,
  });

  it("starts at 1200, rates against each puzzle and tracks the peak", () => {
    const data = { ...emptyHistory(), records: [rec(1, {}), rec(2, { solved: false, outcome: 0 }), rec(3, { bonus: 4 })] };
    const s = gameSummary(data, "chess", "time");
    expect(s.ratingSeries[0].rating).toBe(1200);
    expect(s.deltas.get("r1")).toBe(32);
    expect(s.deltas.get("r2")).toBeLessThan(0);
    expect(s.peak).toBe(Math.max(...s.ratingSeries.map((p) => p.rating)));
    expect(s.peak).toBeGreaterThanOrEqual(1232);
    expect(s.rating).toBeGreaterThan(1200);
  });

  it("counts the daily set as done only after all three puzzles", () => {
    const daily = (i: number, solved: boolean) => rec(i, { mode: "daily", solved, outcome: solved ? 1 : 0 });
    const two = gameSummary({ ...emptyHistory(), records: [daily(1, true), daily(2, false)] }, "chess", "time");
    expect(two.dailyDone.has("2026-11-02")).toBe(false);
    const three = gameSummary({ ...emptyHistory(), records: [daily(1, true), daily(2, false), daily(3, true)] }, "chess", "time");
    expect(three.dailyDone.has("2026-11-02")).toBe(true);
  });

  it("leaves unrated records alone", () => {
    const s = gameSummary({ ...emptyHistory(), records: [rec(1, { outcome: undefined })] }, "chess", "time");
    expect(s.rating).toBe(1200);
    expect(s.solved).toBe(1);
  });
});
