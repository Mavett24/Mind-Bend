import { describe, expect, it } from "vitest";
import { TIERS, suggestTier, type Tier } from "@/engine/difficulty";
import { emptyHistory, gameSummary, type GameRecord, type HistoryData, type Scoring } from "@/engine/history";
import { GAMES } from "@/games/registry";
import { gameAbandon, gameStart, hintUsed, recordEvents, shareChallenge, tutorial, unrecordedComplete } from "./events";

const scoringOf = (id: string): Scoring => (id === "recall" || id === "trivia" ? "points" : "time");
const T0 = Date.parse("2026-11-17T09:00:00Z");
let n = 0;

function rec(over: Partial<GameRecord> = {}): GameRecord {
  n += 1;
  return { id: `r${n}`, at: T0 + n * 60_000, gameId: "path", tier: "medium", mode: "practice", seed: `s${n}`, timeMs: 42_345, solved: true, outcome: 1, ...over };
}

/** Adds a record and returns its events, like recordGame does in the browser. */
function add(data: HistoryData, r: GameRecord) {
  const after = { ...data, records: [...data.records, r] };
  return { after, events: recordEvents(r, data, after, scoringOf) };
}

const names = (events: { name: string }[]) => events.map((e) => e.name);

describe("recordEvents", () => {
  it("turns a quit into game_abandon only", () => {
    const { events } = add(emptyHistory(), rec({ solved: false, quit: true, outcome: undefined, timeMs: 12_345 }));
    expect(events).toEqual([{ name: "game_abandon", params: { game: "path", tier: "medium", mode: "practice", duration_s: 12.3, exit: "left_board" } }]);
  });

  it("describes a rated solve, and marks the very first game", () => {
    const { events } = add(emptyHistory(), rec());
    expect(names(events)).toEqual(["game_complete", "first_game_complete"]);
    const p = events[0].params;
    expect(p).toMatchObject({ game: "path", tier: "medium", mode: "practice", result: "solved", duration_s: 42.3, hints: 0, rated: "yes" });
    expect(typeof p.rating).toBe("number");
    expect(typeof p.rating_change).toBe("number");
    expect(p.rating_change).toBeGreaterThan(0);
  });

  it("counts a first game only once, and not after quits only", () => {
    let data = emptyHistory();
    data = add(data, rec({ quit: true, solved: false, outcome: undefined })).after;
    const first = add(data, rec());
    expect(names(first.events)).toContain("first_game_complete");
    expect(names(add(first.after, rec()).events)).not.toContain("first_game_complete");
  });

  it("leaves rating_change off daily boards, which aren't rated", () => {
    const { events } = add(emptyHistory(), rec({ mode: "daily", outcome: undefined }));
    expect(events[0].params.rated).toBe("no");
    expect(events[0].params.rating_change).toBeUndefined();
  });

  it("keeps points and the puzzle rating when there are any", () => {
    expect(add(emptyHistory(), rec({ gameId: "trivia", points: 7 })).events[0].params.points).toBe(7);
    expect(add(emptyHistory(), rec({ gameId: "chess", opponent: 1640 })).events[0].params.puzzle_rating).toBe(1640);
  });

  it("sends level_up exactly when the suggested tier moves up", () => {
    let data = emptyHistory();
    let levelUps = 0;
    for (let i = 0; i < 300; i++) {
      const r = rec({ tier: "expert" });
      const before = suggestTier(gameSummary(data, "path", "time").rating);
      const { after, events } = add(data, r);
      const now = suggestTier(gameSummary(after, "path", "time").rating);
      const up = events.filter((e) => e.name === "level_up");
      if (now !== before) {
        levelUps++;
        expect(up).toEqual([{ name: "level_up", params: { level: TIERS.indexOf(now) + 1, character: "path", game: "path", tier: now } }]);
      } else {
        expect(up).toEqual([]);
      }
      data = after;
    }
    expect(levelUps).toBeGreaterThan(0);
  });

  it("never sends level_up for chess, whose tiers follow your rating", () => {
    let data = emptyHistory();
    for (let i = 0; i < 60; i++) {
      const { after, events } = add(data, rec({ gameId: "chess", opponent: 2400 }));
      expect(names(events)).not.toContain("level_up");
      data = after;
    }
  });

  it("sends daily_set_complete once, on the game that finishes the set", () => {
    let data = emptyHistory();
    const sent: string[] = [];
    for (const g of GAMES) {
      const boards = g.id === "chess" ? 3 : 1;
      for (let i = 0; i < boards; i++) {
        const { after, events } = add(data, rec({ gameId: g.id, mode: "daily", outcome: undefined, tier: "medium" as Tier }));
        sent.push(...names(events).filter((x) => x === "daily_set_complete").map(() => g.id));
        data = after;
      }
    }
    expect(sent).toEqual([GAMES.at(-1)!.id]);
    // Replaying a daily board the same day doesn't send it again.
    expect(names(add(data, rec({ gameId: "path", mode: "daily", outcome: undefined })).events)).not.toContain("daily_set_complete");
  });
});

describe("other events", () => {
  const ctx = { game: "sudoku", tier: "hard" as Tier, mode: "challenge" as const };

  it("game_start marks retries", () => {
    expect(gameStart(ctx)).toEqual({ name: "game_start", params: { game: "sudoku", tier: "hard", mode: "challenge", retry: "no" } });
    expect(gameStart(ctx, { retry: true }).params.retry).toBe("yes");
  });

  it("game_abandon on page close", () => {
    expect(gameAbandon(ctx, 9_960, "page_close").params).toMatchObject({ duration_s: 10, exit: "page_close" });
  });

  it("unrecorded chess attempts are unrated retries", () => {
    expect(unrecordedComplete({ ...ctx, game: "chess" }, { solved: false, timeMs: 3_000, hints: 1, puzzleRating: 1500 }).params).toMatchObject({
      result: "failed",
      rated: "no",
      retry: "yes",
      puzzle_rating: 1500,
    });
  });

  it("hint, share and tutorial events use GA4's names where one exists", () => {
    expect(hintUsed(ctx, 2)).toEqual({ name: "hint_used", params: { game: "sudoku", tier: "hard", mode: "challenge", hint_number: 2 } });
    expect(shareChallenge("path", "clipboard")).toEqual({ name: "share", params: { method: "clipboard", content_type: "challenge_link", item_id: "path", game: "path" } });
    expect(tutorial("weave", "begin").name).toBe("tutorial_begin");
    expect(tutorial("weave", "complete").name).toBe("tutorial_complete");
  });

  it("keeps every name and value inside GA4's limits", () => {
    const all = [gameStart(ctx), gameAbandon(ctx, 1, "left_board"), hintUsed(ctx, 1), shareChallenge("path", "prompt"), ...add(emptyHistory(), rec()).events];
    for (const e of all) {
      expect(e.name).toMatch(/^[a-z][a-z0-9_]{0,39}$/);
      expect(Object.keys(e.params).length).toBeLessThanOrEqual(25);
      for (const [k, v] of Object.entries(e.params)) {
        expect(k).toMatch(/^[a-z][a-z0-9_]{0,39}$/);
        if (typeof v === "string") expect(v.length).toBeLessThanOrEqual(100);
      }
    }
  });
});
