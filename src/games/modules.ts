import type { GameId } from "./registry";
import type { GameModule } from "./types";
import { generatePath, PATH_PAR_MS } from "./path/engine";
import { PathBoard } from "./path/Board";
import { BALANCE_PAR_MS, generateBalance } from "./balance/engine";
import { BalanceBoard } from "./balance/Board";
import { BLOCKS_PAR_MS, generateBlocks } from "./blocks/engine";
import { BlocksBoard } from "./blocks/Board";
import { generateRecall, RECALL_PAR_MS } from "./recall/engine";
import { RecallBoard } from "./recall/Board";
import { generateWeave, WEAVE_PAR_MS } from "./weave/engine";
import { WeaveBoard } from "./weave/Board";
import { generateTrivia, TRIVIA_PAR_MS } from "./trivia/engine";
import { TriviaBoard } from "./trivia/Board";
import { generateSudoku, SUDOKU_PAR_MS } from "./sudoku/engine";
import { SudokuBoard } from "./sudoku/Board";

/** Score lines come from each game's spec in docs/games/. */
const path: GameModule<ReturnType<typeof generatePath>> = {
  generate: generatePath,
  parMs: PATH_PAR_MS,
  Board: PathBoard,
  lines: {
    high: ["Clean lines. No hesitation.", "You saw the whole route before you started.", "Straight to the point. All of them."],
    mid: ["Got there. Took the scenic route.", "A solid line, a few detours.", "Every cell, accounted for."],
    low: ["A path was found. Eventually.", "The long way round still counts.", "Lost for a bit. Found it anyway."],
  },
};

const balance: GameModule<ReturnType<typeof generateBalance>> = {
  generate: generateBalance,
  parMs: BALANCE_PAR_MS,
  Board: BalanceBoard,
  lines: {
    high: ["Perfectly balanced.", "Equilibrium, achieved.", "Not a single wobble."],
    mid: ["Stable enough.", "Level, after a little leaning.", "Even. Mostly by reason."],
    low: ["It tipped a few times, but it holds.", "Balanced, eventually.", "The scales took some convincing."],
  },
};

const blocks: GameModule<ReturnType<typeof generateBlocks>> = {
  generate: generateBlocks,
  parMs: BLOCKS_PAR_MS,
  Board: BlocksBoard,
  lines: {
    high: ["Everything in its place.", "Packed like a pro.", "Not a cell wasted."],
    mid: ["Neatly packed.", "It all lines up.", "Tidy work."],
    low: ["It all fits. Somehow.", "A few redraws, a full grid.", "Square pegs, square holes, eventually."],
  },
};

const recall: GameModule<ReturnType<typeof generateRecall>> = {
  generate: generateRecall,
  parMs: RECALL_PAR_MS,
  Board: RecallBoard,
  scoring: "points",
  lines: {
    high: ["Your eyes keep receipts.", "A memory with a colour profile.", "Calibrated."],
    mid: ["Close enough to argue about.", "The gist survived. The details wandered.", "Respectable, for a human."],
    low: ["Colours are slippery. Yours slipped.", "Memory: lossy compression.", "Same rainbow, different stripe."],
  },
};

const weave: GameModule<Awaited<ReturnType<typeof generateWeave>>> = {
  generate: generateWeave,
  parMs: WEAVE_PAR_MS,
  Board: WeaveBoard,
  lines: {
    high: ["Fluent.", "You read the grid like a sentence.", "Untangled in record time."],
    mid: ["Untangled.", "Every letter found its word.", "Woven back together."],
    low: ["Knots undone, one by one.", "The words were in there somewhere. You found them.", "Slow and thorough. Still counts."],
  },
};

const trivia: GameModule<ReturnType<typeof generateTrivia>> = {
  generate: generateTrivia,
  parMs: TRIVIA_PAR_MS,
  Board: TriviaBoard,
  scoring: "points",
  lines: {
    high: ["Calibrated.", "A walking almanac.", "Quick and right. Rare combination."],
    mid: ["Good instincts.", "More right than wrong, which is the point.", "Respectable range."],
    low: ["Numbers are hard. Respectfully.", "Trivia is mostly trivia.", "Next round's on you."],
  },
};

const sudoku: GameModule<ReturnType<typeof generateSudoku>> = {
  generate: generateSudoku,
  parMs: SUDOKU_PAR_MS,
  Board: SudokuBoard,
  lines: {
    high: ["Nine for nine.", "Every number knew its place.", "Clean grid, no guesswork."],
    mid: ["Solid logic.", "Filled in, fair and square.", "The numbers fell into line."],
    low: ["Slow, steady, solved.", "Every box checked. Eventually.", "Patience is a technique too."],
  },
};

/** Games with their own session instead of the shared board flow (chess runs puzzle after puzzle). */
export const OWN_SESSION = new Set<GameId>(["chess"]);

/** Whether a game can be played: a shared-flow module or its own session. */
export const playable = (id: GameId) => !!MODULES[id] || OWN_SESSION.has(id);

// Each module has its own puzzle type; the shared flow only passes puzzles back to the board that made them.
export const MODULES: Partial<Record<GameId, GameModule<unknown>>> = {
  path: path as GameModule<unknown>,
  balance: balance as GameModule<unknown>,
  blocks: blocks as GameModule<unknown>,
  recall: recall as GameModule<unknown>,
  weave: weave as GameModule<unknown>,
  trivia: trivia as GameModule<unknown>,
  sudoku: sudoku as GameModule<unknown>,
};
