import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createRng } from "@/engine/rng";
import { emptyHistory, gameSummary, puzzleBests, type GameRecord } from "@/engine/history";
import { bandsAround, fromTuple, playerMoves, type ChessPuzzle, type PuzzleTuple } from "./engine";
import { parseRushSeed, pickRushPuzzle, rushBests, rushSeed, rushStep } from "./rush";

const DIR = join(process.cwd(), "public/data/chess");
const index = JSON.parse(readFileSync(join(DIR, "index.json"), "utf8")) as { bands: { band: number }[] };
const available = index.bands.map((b) => b.band);
const byBand = new Map<number, ChessPuzzle[]>(available.map((b) => [b, (JSON.parse(readFileSync(join(DIR, `${b}.json`), "utf8")) as PuzzleTuple[]).map(fromTuple)]));
/** The pool the session loads for a target: the bands around it. */
const poolFor = (target: number) => bandsAround(target, available).flatMap((b) => byBand.get(b) ?? []);

/** A whole run, the way the session builds it: one rng per step, no repeats. */
function run(seed: string, length: number): ChessPuzzle[] {
  const used = new Set<string>();
  const out: ChessPuzzle[] = [];
  for (let i = 0; i < length; i++) {
    const step = rushStep(i);
    const p = pickRushPuzzle(poolFor(step.target), step, createRng(`rush:${seed}:${i}`), used);
    used.add(p.id);
    out.push(p);
  }
  return out;
}

describe("puzzle rush ramp", () => {
  it("climbs and never goes down", () => {
    for (let i = 1; i < 80; i++) expect(rushStep(i).target).toBeGreaterThanOrEqual(rushStep(i - 1).target);
    expect(rushStep(0).target).toBe(600);
    expect(rushStep(200).target).toBe(2800);
  });

  it("opens on five mates in one, then mates in two at most", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      const r = run(seed, 10);
      for (const p of r.slice(0, 5)) {
        expect(p.themes, p.id).toContain("mateIn1");
        expect(playerMoves(p)).toBe(1);
        expect(p.rating).toBeLessThan(900);
      }
      for (const p of r.slice(5, 10)) {
        expect(p.themes.some((t) => t === "mateIn1" || t === "mateIn2"), p.id).toBe(true);
        expect(playerMoves(p)).toBeLessThanOrEqual(2);
      }
    }
  });

  it("keeps each puzzle near its step and within the step's length, for 60 puzzles", () => {
    for (const seed of ["k3f9x2", "zz", "q1"]) {
      const r = run(seed, 60);
      r.forEach((p, i) => {
        const step = rushStep(i);
        expect(Math.abs(p.rating - step.target), `#${i} ${p.id}`).toBeLessThanOrEqual(160);
        expect(playerMoves(p), `#${i} ${p.id}`).toBeLessThanOrEqual(step.maxMoves);
      });
    }
  });

  it("never repeats a puzzle in a run", () => {
    const r = run("dupes", 80);
    expect(new Set(r.map((p) => p.id)).size).toBe(80);
  });

  it("gives the same run for the same seed and a different one for another", () => {
    expect(run("same", 30).map((p) => p.id)).toEqual(run("same", 30).map((p) => p.id));
    expect(run("same", 10).map((p) => p.id)).not.toEqual(run("other", 10).map((p) => p.id));
  });
});

describe("rush records", () => {
  it("round-trips the seed", () => {
    expect(parseRushSeed(rushSeed(3, "k3f9x2"))).toEqual({ minutes: 3, seed: "k3f9x2" });
    expect(parseRushSeed(rushSeed(5, "a"))).toEqual({ minutes: 5, seed: "a" });
    expect(parseRushSeed("rush4-a")).toBeNull();
    expect(parseRushSeed("1400-00K8j")).toBeNull();
  });

  const rec = (over: Partial<GameRecord>): GameRecord => ({
    id: Math.random().toString(36),
    at: 1_800_000_000_000,
    gameId: "chess",
    tier: "medium",
    mode: "rush",
    seed: "rush3-a",
    timeMs: 180_000,
    solved: true,
    ...over,
  });

  it("keeps the best per length and ignores quits", () => {
    const data = { ...emptyHistory(), records: [rec({ score: 12 }), rec({ score: 19 }), rec({ score: 30, quit: true }), rec({ seed: "rush5-b", score: 22 })] };
    expect(rushBests(data)).toEqual({ best: { 3: 19, 5: 22 }, runs: 3 });
    expect(rushBests(emptyHistory())).toEqual({ best: { 3: null, 5: null }, runs: 0 });
  });

  it("never touches the puzzle rating, solves or bests", () => {
    const data = { ...emptyHistory(), records: [rec({ score: 25, outcome: 1, opponent: 2000 })] };
    const s = gameSummary(data, "chess", "time");
    expect(s.rating).toBe(1200);
    expect(s.played).toBe(0);
    expect(s.solved).toBe(0);
    expect(puzzleBests(data, "chess").bestRun).toBe(0);
  });
});
