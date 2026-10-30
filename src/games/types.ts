import type { ComponentType } from "react";
import type { Tier } from "@/engine/difficulty";
import type { BoardKey } from "@/engine/seed";

export interface SolveDetail {
  /** Shown on the result screen, e.g. { label: "backtracks", value: 3 }. Not part of the score. */
  extra?: { label: string; value: number };
  /** Scored games: 0 to 10. Required when the module's scoring is "points". */
  points?: number;
}

export interface BoardProps<P> {
  puzzle: P;
  onSolved: (detail: SolveDetail) => void;
}

export interface ScoreLines {
  high: readonly string[];
  mid: readonly string[];
  low: readonly string[];
}

/** Everything the shared play flow needs from a game. */
export interface GameModule<P> {
  /** Pure given its data. May be async when the game loads content first (weave fetches its word list). */
  generate: (key: BoardKey) => P | Promise<P>;
  parMs: Record<Tier, number>;
  Board: ComponentType<BoardProps<P>>;
  lines: ScoreLines;
  /** "time": fastest solve wins (default). "points": the board reports a 0 to 10 score, the clock is hidden. */
  scoring?: "time" | "points";
}
