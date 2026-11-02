/**
 * chess: tactics puzzles from the Lichess puzzle database (CC0), rated like chess.com.
 *
 * Unlike the other games, boards are not generated: a good tactic needs an engine-verified line,
 * so we serve a curated set (see scripts/build-chess.mjs and D-046). Everything here is pure:
 * picking a puzzle for a rating, judging a move, the speed target and the rating maths.
 * Move legality comes from chess.js, which is pure TypeScript.
 */
import { Chess, type Square } from "chess.js";
import type { Tier } from "@/engine/difficulty";
import type { Rng } from "@/engine/rng";

// ---------------------------------------------------------------- data

/** As stored in public/data/chess/<band>.json: [id, fen, uci moves, rating, themes]. */
export type PuzzleTuple = [string, string, string, number, string];

export interface ChessPuzzle {
  id: string;
  /** Position before the opponent's setup move. */
  fen: string;
  /** UCI moves. moves[0] is the opponent's setup move, then the player and opponent alternate. */
  moves: string[];
  rating: number;
  themes: string[];
}

export const fromTuple = ([id, fen, moves, rating, themes]: PuzzleTuple): ChessPuzzle => ({
  id,
  fen,
  moves: moves.split(" "),
  rating,
  themes: themes ? themes.split(" ") : [],
});

/** Rating bands are 200 wide; a puzzle's band is the file it lives in. */
export const BAND = 200;
export const bandOf = (rating: number) => Math.floor(rating / BAND) * BAND;

/** Bands to load to find puzzles within `spread` of a target. */
export function bandsAround(target: number, available: readonly number[], spread = 200): number[] {
  const want = available.filter((b) => b + BAND > target - spread && b <= target + spread);
  if (want.length) return want;
  // Off the ends of the set: use the closest band.
  return [available.reduce((best, b) => (Math.abs(b + BAND / 2 - target) < Math.abs(best + BAND / 2 - target) ? b : best))];
}

/** Player moves in a puzzle (the setup move is the opponent's). */
export const playerMoves = (p: ChessPuzzle) => Math.floor(p.moves.length / 2);

// ---------------------------------------------------------------- picking

/** Practice tiers are offsets from your rating, the way chess.com lets you pick easier or harder. */
export const PRACTICE_OFFSET: Record<Tier, number> = { easy: -300, medium: 0, hard: 200, expert: 400 };

/** The daily set: three shared puzzles that ramp up. Same for everyone, rated by Elo against each puzzle. */
export const DAILY_TARGETS = [1300, 1700, 2100] as const;
export const DAILY_TIERS: readonly Tier[] = ["easy", "medium", "hard"];

export const MIN_TARGET = 500;
export const MAX_TARGET = 2900;
const clampTarget = (r: number) => Math.min(MAX_TARGET, Math.max(MIN_TARGET, r));

/** Where a practice puzzle should sit: your rating plus the tier offset, with a little jitter for variety. */
export function practiceTarget(rating: number, tier: Tier, rng: Rng): number {
  return clampTarget(rating + PRACTICE_OFFSET[tier] + rng.int(-60, 60));
}

/**
 * One puzzle near `target`, avoiding ids in `exclude` (puzzles you've already seen).
 * Picks at random among the closest few so the same rating doesn't always give the same puzzle.
 */
export function pickPuzzle(pool: readonly ChessPuzzle[], target: number, rng: Rng, exclude: ReadonlySet<string> = new Set()): ChessPuzzle {
  if (pool.length === 0) throw new RangeError("pickPuzzle() on an empty pool");
  const fresh = pool.filter((p) => !exclude.has(p.id));
  const from = fresh.length ? fresh : pool;
  const near = [...from].sort((a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target) || (a.id < b.id ? -1 : 1)).slice(0, 24);
  return rng.pick(near);
}

// ---------------------------------------------------------------- playing

export interface Move {
  from: Square;
  to: Square;
  promotion?: string;
}

export const parseUci = (uci: string): Move => ({
  from: uci.slice(0, 2) as Square,
  to: uci.slice(2, 4) as Square,
  promotion: uci[4] || undefined,
});

export const toUci = (m: Move) => `${m.from}${m.to}${m.promotion ?? ""}`;

/** The colour the player plays: the side to move after the setup move. */
export function playerColor(p: ChessPuzzle): "w" | "b" {
  return new Chess(p.fen).turn() === "w" ? "b" : "w";
}

/** A chess.js game at the puzzle's start position, with `ply` solution moves played (ply 1 = after the setup move). */
export function positionAt(p: ChessPuzzle, ply: number): Chess {
  const game = new Chess(p.fen);
  for (const uci of p.moves.slice(0, ply)) game.move(parseUci(uci));
  return game;
}

export type Verdict = "correct" | "mate" | "wrong" | "illegal";

/**
 * Judges the player's move at `ply` (an odd index into moves). Any move that delivers mate is
 * correct even if the database line differs, the way Lichess and chess.com both accept it.
 */
export function judgeMove(p: ChessPuzzle, ply: number, move: Move): Verdict {
  const game = positionAt(p, ply);
  let played;
  try {
    played = game.move({ from: move.from, to: move.to, promotion: move.promotion ?? "q" });
  } catch {
    return "illegal";
  }
  const expected = p.moves[ply];
  const uci = `${played.from}${played.to}${played.promotion ?? ""}`;
  if (uci === expected) return "correct";
  if (game.isCheckmate()) return "mate";
  return "wrong";
}

/** True when `ply` moves have been played and nothing is left for the player. */
export const isComplete = (p: ChessPuzzle, ply: number) => ply >= p.moves.length;

// ---------------------------------------------------------------- speed

/**
 * Target solve time, scaled by how hard the puzzle is and how long its line is: about 18s for a
 * one-mover at 1000, 32s at 2000, plus 6s for every extra move you have to find.
 */
export function targetMs(rating: number, moves: number): number {
  const first = 11_000 + 14 * Math.max(0, rating - 500);
  return Math.round(first + 6_000 * Math.max(0, moves - 1));
}

export const MAX_SPEED_BONUS = 4;

/** Full bonus at half the target or faster, fading to 0 at twice the target. */
export function speedBonus(timeMs: number, target: number): number {
  const t = Math.min(1, Math.max(0, (2 * target - timeMs) / (1.5 * target)));
  return Math.round(MAX_SPEED_BONUS * t);
}

// ---------------------------------------------------------------- rating

export { PUZZLE_START_RATING as CHESS_START_RATING, puzzleK, hintFactor, expectedScore, puzzleDelta, applyPuzzle, type PuzzleResult } from "@/engine/puzzle-rating";

/** Milestones every 100 points replace tiers on the start card: "63 to 1500". */
export function ratingMilestone(rating: number): { from: number; to: number; progress: number } {
  const from = Math.floor(rating / 100) * 100;
  return { from, to: from + 100, progress: (rating - from) / 100 };
}

// ---------------------------------------------------------------- themes

/** Plain names for the Lichess themes worth showing after a puzzle. Others stay hidden. */
export const THEME_LABEL: Record<string, string> = {
  mateIn1: "mate in 1",
  mateIn2: "mate in 2",
  mateIn3: "mate in 3",
  mateIn4: "mate in 4",
  mateIn5: "mate in 5",
  backRankMate: "back rank mate",
  smotheredMate: "smothered mate",
  fork: "fork",
  pin: "pin",
  skewer: "skewer",
  discoveredAttack: "discovered attack",
  doubleCheck: "double check",
  sacrifice: "sacrifice",
  deflection: "deflection",
  attraction: "attraction",
  clearance: "clearance",
  interference: "interference",
  intermezzo: "in-between move",
  hangingPiece: "hanging piece",
  trappedPiece: "trapped piece",
  capturingDefender: "remove the defender",
  promotion: "promotion",
  underPromotion: "underpromotion",
  enPassant: "en passant",
  castling: "castling",
  quietMove: "quiet move",
  defensiveMove: "defensive move",
  xRayAttack: "x-ray",
  zugzwang: "zugzwang",
  exposedKing: "exposed king",
  kingsideAttack: "kingside attack",
  queensideAttack: "queenside attack",
  endgame: "endgame",
  middlegame: "middlegame",
  opening: "opening",
};

/** Up to three themes, motifs first, phase of the game last. */
export function themeLabels(p: ChessPuzzle, max = 3): string[] {
  const phase = new Set(["endgame", "middlegame", "opening"]);
  const known = p.themes.filter((t) => THEME_LABEL[t]);
  const ordered = [...known.filter((t) => !phase.has(t)), ...known.filter((t) => phase.has(t))];
  return ordered.slice(0, max).map((t) => THEME_LABEL[t]);
}

// ---------------------------------------------------------------- links

/** A challenge link names the exact puzzle: s=<band>-<id>, e.g. 1400-00K8j. */
export const puzzleSeed = (p: ChessPuzzle) => `${bandOf(p.rating)}-${p.id}`;

export function parsePuzzleSeed(seed: string): { band: number; id: string } | null {
  const m = /^(\d{3,4})-([A-Za-z0-9]{3,10})$/.exec(seed);
  return m ? { band: Number(m[1]), id: m[2] } : null;
}
