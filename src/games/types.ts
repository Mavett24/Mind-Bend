import type { ComponentType } from "react";
import type { Tier } from "@/engine/difficulty";
import type { BoardKey } from "@/engine/seed";

export interface SolveDetail {
  /** Shown on the result screen, e.g. { label: "backtracks", value: 3 }. Not part of the score. */
  extra?: { label: string; value: number };
}

export interface BoardProps<P> {
  puzzle: P;
  onSolved: (detail: SolveDetail) => void;
}

export interface ScoreLines {
  fast: readonly string[];
  average: readonly string[];
  slow: readonly string[];
}

/** Everything the shared play flow needs from a game. */
export interface GameModule<P> {
  generate: (key: BoardKey) => P;
  parMs: Record<Tier, number>;
  Board: ComponentType<BoardProps<P>>;
  lines: ScoreLines;
}
