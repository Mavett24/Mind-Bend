import type { GameId } from "./registry";
import type { GameModule } from "./types";
import { generatePath, PATH_PAR_MS } from "./path/engine";
import { PathBoard } from "./path/Board";
import { BALANCE_PAR_MS, generateBalance } from "./balance/engine";
import { BalanceBoard } from "./balance/Board";

/** Score lines come from each game's spec in docs/games/. */
const path: GameModule<ReturnType<typeof generatePath>> = {
  generate: generatePath,
  parMs: PATH_PAR_MS,
  Board: PathBoard,
  lines: {
    fast: ["Clean lines. No hesitation.", "You saw the whole route before you started.", "Straight to the point. All of them."],
    average: ["Got there. Took the scenic route.", "A solid line, a few detours.", "Every cell, accounted for."],
    slow: ["A path was found. Eventually.", "The long way round still counts.", "Lost for a bit. Found it anyway."],
  },
};

const balance: GameModule<ReturnType<typeof generateBalance>> = {
  generate: generateBalance,
  parMs: BALANCE_PAR_MS,
  Board: BalanceBoard,
  lines: {
    fast: ["Perfectly balanced.", "Equilibrium, achieved.", "Not a single wobble."],
    average: ["Stable enough.", "Level, after a little leaning.", "Even. Mostly by reason."],
    slow: ["It tipped a few times, but it holds.", "Balanced, eventually.", "The scales took some convincing."],
  },
};

// Each module has its own puzzle type; the shared flow only passes puzzles back to the board that made them.
export const MODULES: Partial<Record<GameId, GameModule<unknown>>> = {
  path: path as GameModule<unknown>,
  balance: balance as GameModule<unknown>,
};
