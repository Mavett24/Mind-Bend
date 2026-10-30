export type GameId = "path" | "balance" | "blocks" | "weave" | "recall" | "trivia";
export type GameStatus = "live" | "building";

export interface GameMeta {
  id: GameId;
  name: string;
  skill: string;
  tagline: string;
  /** Two-sentence instructions shown on the start card. */
  rules: string;
  status: GameStatus;
}

export const GAMES: readonly GameMeta[] = [
  {
    id: "path",
    name: "path",
    skill: "route planning",
    tagline: "One line through every cell, numbers in order.",
    rules: "Connect the numbers in order. Fill every cell.",
    status: "live",
  },
  {
    id: "balance",
    name: "balance",
    skill: "deduction",
    tagline: "Dots and rings, perfectly even.",
    rules: "Equal dots and rings per line, never three in a row. = joins matches, × joins opposites.",
    status: "live",
  },
  {
    id: "blocks",
    name: "blocks",
    skill: "spatial",
    tagline: "Split the grid into rectangles that fit the clues.",
    rules: "Draw a rectangle around every clue. Match its size and shape.",
    status: "building",
  },
  {
    id: "weave",
    name: "weave",
    skill: "words",
    tagline: "A grid made entirely of hidden words.",
    rules: "Every letter belongs to one word. Use them all.",
    status: "building",
  },
  {
    id: "recall",
    name: "recall",
    skill: "working memory",
    tagline: "Hold the colours. Rebuild one from memory.",
    rules: "Remember the colours and where they were. Then rebuild one.",
    status: "building",
  },
  {
    id: "trivia",
    name: "trivia",
    skill: "knowledge",
    tagline: "Higher or lower, and categories.",
    rules: "Pick the bigger number, or the right answer. Keep the streak alive.",
    status: "building",
  },
];

export function getGame(id: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === id);
}
