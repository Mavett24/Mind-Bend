/**
 * How-to-play content for every game: shown on the intro screen before a board,
 * and the tier lines are shown under the difficulty picker on the start card.
 * Copy rules: plain words, no em dashes, two lines at most per step.
 */
import type { ReactNode } from "react";
import type { Tier } from "@/engine/difficulty";
import type { GameId } from "./registry";
import { BLOCKS_PALETTE } from "./blocks/palette";
import { SUDOKU_GIVENS } from "./sudoku/engine";
import { PRACTICE_OFFSET } from "./chess/engine";
import { PieceAt } from "./chess/pieces";

export interface GameIntro {
  /** Three or four numbered steps. */
  steps: string[];
  /** One line on how to play with touch and keys. */
  controls: string;
  /** What each difficulty actually changes, one short line each. */
  tiers: Record<Tier, string>;
  Example: () => ReactNode;
}

// ---------------------------------------------------------------- example drawings (static SVG, monochrome + accent)

/** A back-rank mate in one: the rook slides up the file. */
function ChessExample() {
  return (
    <svg viewBox="0 0 4 3" className="h-28 w-[150px]" aria-hidden>
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={(i % 4) + 0.03} y={Math.floor(i / 4) + 0.03} width={0.94} height={0.94} rx={0.14} className={(i % 4 + Math.floor(i / 4)) % 2 === 0 ? "fill-square-light" : "fill-square-dark"} />
      ))}
      <PieceAt type="k" color="b" x={2} y={0} size={1} />
      <PieceAt type="p" color="b" x={1} y={1} size={1} />
      <PieceAt type="p" color="b" x={2} y={1} size={1} />
      <PieceAt type="p" color="b" x={3} y={1} size={1} />
      <PieceAt type="r" color="w" x={0} y={2} size={1} />
      <line x1={0.5} y1={2.25} x2={0.5} y2={0.72} className="stroke-hue-chess" strokeWidth={0.12} strokeLinecap="round" />
      <path d="M0.5 0.5L0.32 0.8H0.68Z" className="fill-hue-chess" />
    </svg>
  );
}

const cellBg = "fill-graphite";

function PathExample() {
  const n = 3;
  const route = [0, 1, 2, 5, 4, 3, 6, 7, 8];
  const numbers: Record<number, number> = { 0: 1, 4: 2, 8: 3 };
  const c = (i: number) => ({ x: (i % n) + 0.5, y: Math.floor(i / n) + 0.5 });
  return (
    <svg viewBox="0 0 3 3" className="h-28 w-28" aria-hidden>
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={(i % n) + 0.06} y={Math.floor(i / n) + 0.06} width={0.88} height={0.88} rx={0.14} className="fill-ember-wash" />
      ))}
      <polyline points={route.map((i) => `${c(i).x},${c(i).y}`).join(" ")} fill="none" className="stroke-ember" strokeWidth={0.32} strokeLinecap="round" strokeLinejoin="round" />
      {Object.entries(numbers).map(([cell, num]) => (
        <g key={cell}>
          <circle cx={c(+cell).x} cy={c(+cell).y} r={0.28} className="fill-paper" />
          <text x={c(+cell).x} y={c(+cell).y} textAnchor="middle" dominantBaseline="central" fontSize={0.3} className="fill-void font-mono font-bold">
            {num}
          </text>
        </g>
      ))}
    </svg>
  );
}

function BalanceExample() {
  const row = (cells: ("d" | "r")[], bad: boolean, y: number) =>
    cells.map((v, i) => (
      <g key={`${y}-${i}`}>
        <rect x={i + 0.06} y={y + 0.06} width={0.88} height={0.88} rx={0.14} className={cellBg} />
        {v === "d" ? (
          <circle cx={i + 0.5} cy={y + 0.5} r={0.22} className="fill-paper" />
        ) : (
          <circle cx={i + 0.5} cy={y + 0.5} r={0.19} fill="none" className="stroke-paper" strokeWidth={0.07} />
        )}
        {bad && i < 3 && <rect x={i + 0.2} y={y + 0.86} width={0.6} height={0.05} rx={0.02} className="fill-ember" />}
      </g>
    ));
  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-center gap-1">
        <svg viewBox="0 0 6 1" className="h-7 w-40" aria-hidden>
          {row(["d", "r", "d", "d", "r", "r"], false, 0)}
        </svg>
        <span className="text-caption text-paper">✓ 3 and 3</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <svg viewBox="0 0 6 1" className="h-7 w-40" aria-hidden>
          {row(["d", "d", "d", "r", "r", "r"], true, 0)}
        </svg>
        <span className="text-caption text-ember">× three in a row</span>
      </div>
    </div>
  );
}

function BlocksExample() {
  const rects = [
    { r: 0, c: 0, h: 2, w: 2, clue: [0, 0], area: 4, colour: 1 },
    { r: 0, c: 2, h: 3, w: 1, clue: [1, 2], area: 3, colour: 0 },
    { r: 2, c: 0, h: 1, w: 2, clue: [2, 1], area: 2, colour: 2 },
  ];
  return (
    <svg viewBox="0 0 3 3" className="h-28 w-28" aria-hidden>
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={(i % 3) + 0.06} y={Math.floor(i / 3) + 0.06} width={0.88} height={0.88} rx={0.14} className={cellBg} />
      ))}
      {rects.map((r, i) => {
        const col = BLOCKS_PALETTE[r.colour];
        return (
          <g key={i}>
            <rect x={r.c + 0.06} y={r.r + 0.06} width={r.w - 0.12} height={r.h - 0.12} rx={0.14} fill={col} fillOpacity={0.22} stroke={col} strokeWidth={0.05} />
            <text x={r.clue[1] + 0.5} y={r.clue[0] + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={0.34} fill={col} className="font-mono font-bold">
              {r.area}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SudokuExample() {
  // A solved 4×4 mini grid: every row, column and 2×2 box has 1 to 4 once.
  const grid = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
  const givens = new Set([0, 3, 5, 6, 9, 10, 12, 15]);
  return (
    <svg viewBox="0 0 4.3 4.3" className="h-28 w-28" aria-hidden>
      {grid.map((v, i) => {
        const r = Math.floor(i / 4);
        const c = i % 4;
        const x = c + (c >= 2 ? 0.3 : 0);
        const y = r + (r >= 2 ? 0.3 : 0);
        return (
          <g key={i}>
            <rect x={x + 0.05} y={y + 0.05} width={0.9} height={0.9} rx={0.14} className={cellBg} />
            <text
              x={x + 0.5}
              y={y + 0.52}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={0.5}
              className={`font-mono ${givens.has(i) ? "fill-paper font-bold" : "fill-entry"}`}
            >
              {v}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function WeaveExample() {
  const letters = ["C", "A", "T", "■", "R", "S", "D", "O", "G"];
  const word = [0, 1, 2]; // CAT
  const word2 = [6, 7, 8]; // DOG
  const c = (i: number) => ({ x: (i % 3) + 0.5, y: Math.floor(i / 3) + 0.5 });
  return (
    <svg viewBox="0 0 3 3" className="h-28 w-28" aria-hidden>
      <polyline points={word.map((i) => `${c(i).x},${c(i).y}`).join(" ")} fill="none" stroke={BLOCKS_PALETTE[0]} strokeOpacity={0.6} strokeWidth={0.2} strokeLinecap="round" />
      <polyline points={word2.map((i) => `${c(i).x},${c(i).y}`).join(" ")} fill="none" stroke={BLOCKS_PALETTE[1]} strokeOpacity={0.6} strokeWidth={0.2} strokeLinecap="round" />
      {letters.map((l, i) =>
        l === "■" ? (
          <rect key={i} x={(i % 3) + 0.1} y={Math.floor(i / 3) + 0.1} width={0.8} height={0.8} rx={0.14} className="fill-slate" />
        ) : (
          <g key={i}>
            <circle
              cx={c(i).x}
              cy={c(i).y}
              r={0.38}
              fill={word.includes(i) ? BLOCKS_PALETTE[0] : word2.includes(i) ? BLOCKS_PALETTE[1] : undefined}
              className={word.includes(i) || word2.includes(i) ? "" : "fill-graphite"}
            />
            <text x={c(i).x} y={c(i).y} textAnchor="middle" dominantBaseline="central" fontSize={0.36} className={`font-mono font-bold ${word.includes(i) || word2.includes(i) ? "fill-void" : "fill-paper"}`}>
              {l}
            </text>
          </g>
        ),
      )}
    </svg>
  );
}

function RecallExample() {
  const swatch = "#5b95f7";
  return (
    <div className="flex items-center gap-2 font-mono text-caption text-steel">
      <div className="flex flex-col items-center gap-1">
        <div className="grid h-14 w-14 grid-rows-2 gap-[2px] overflow-hidden rounded-cell">
          <div style={{ background: "#e69f00" }} />
          <div style={{ background: swatch }} />
        </div>
        <span>look</span>
      </div>
      <span aria-hidden>→</span>
      <div className="flex flex-col items-center gap-1">
        <div className="grid h-14 w-14 grid-rows-2 gap-[2px] overflow-hidden rounded-cell">
          <div className="border border-dashed border-slate" />
          <div className="flex items-center justify-center border border-ember text-paper">?</div>
        </div>
        <span>rebuild</span>
      </div>
      <span aria-hidden>→</span>
      <div className="flex flex-col items-center gap-1">
        <div className="grid h-14 w-14 grid-rows-2 overflow-hidden rounded-cell">
          <div style={{ background: "#6f8ef0" }} />
          <div style={{ background: swatch }} />
        </div>
        <span>compare</span>
      </div>
    </div>
  );
}

function TriviaExample() {
  return (
    <div className="flex w-full max-w-[260px] flex-col gap-2">
      <div className="flex items-center justify-between rounded-cell border border-paper bg-iron px-3 py-2 font-mono text-[13px]">
        <span>Japan</span>
        <span className="text-fog">124 million ✓</span>
      </div>
      <div className="flex items-center justify-between rounded-cell border border-iron bg-graphite px-3 py-2 font-mono text-[13px]">
        <span>Germany</span>
        <span className="text-fog">84 million</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- content

export const INTRO: Record<GameId, GameIntro> = {
  path: {
    steps: [
      "Start on 1 and draw a single line through the grid.",
      "Pass through the numbers in order: 1, 2, 3 and so on.",
      "Fill every cell. White bars are walls you can't cross.",
    ],
    controls: "Drag to draw. Drag back or tap a cell on the line to undo. Keys: arrows, backspace.",
    tiers: {
      easy: "5×5 grid, lots of numbers to guide you",
      medium: "6×6 grid, fewer numbers",
      hard: "7×7 grid, few numbers, a few walls",
      expert: "8×8 grid, only the numbers you need, more walls",
    },
    Example: PathExample,
  },
  balance: {
    steps: [
      "Fill every cell with a dot or a ring.",
      "Each row and column gets the same number of dots and rings.",
      "Never three of the same in a row. = means the two cells match, × means they're opposite.",
    ],
    controls: "Tap a cell to cycle empty, dot, ring. Keys: arrows, 1 dot, 2 ring, backspace.",
    tiers: {
      easy: "6×6 grid, 13 cells given",
      medium: "6×6 grid, 9 cells given",
      hard: "6×6 grid, about 6 cells given, longer chains of logic",
      expert: "8×8 grid, needs one step of 'what if' thinking",
    },
    Example: BalanceExample,
  },
  blocks: {
    steps: [
      "Split the grid into rectangles.",
      "Each rectangle holds exactly one number, and its area matches that number.",
      "The small icon shows the shape: square, wide or tall. A dashed icon means any shape.",
    ],
    controls: "Drag from corner to corner to draw. Tap a rectangle to remove it. Keys: arrows, enter, delete.",
    tiers: {
      easy: "5×5 grid, every shape shown",
      medium: "6×6 grid, a quarter of shapes hidden",
      hard: "7×7 grid, half the shapes hidden",
      expert: "8×8 grid, most shapes hidden",
    },
    Example: BlocksExample,
  },
  sudoku: {
    steps: [
      "Fill every empty cell with a number.",
      "Each row, column and box holds every number exactly once.",
      "Use notes to pencil in options. Numbers that clash get an orange underline.",
    ],
    controls: "Tap a cell, then a number. Tap the same number again to clear. Keys: arrows, numbers, N for notes, backspace.",
    tiers: {
      easy: `6×6 grid, ${SUDOKU_GIVENS.easy} numbers given`,
      medium: `6×6 grid, ${SUDOKU_GIVENS.medium} numbers given`,
      hard: `6×6 grid, ${SUDOKU_GIVENS.hard} numbers given`,
      expert: `6×6 grid, only ${SUDOKU_GIVENS.expert} numbers given`,
    },
    Example: SudokuExample,
  },
  weave: {
    steps: [
      "The grid hides a few words. The boxes below show how long each one is.",
      "Trace a word by joining letters up, down, left or right. No diagonals.",
      "Every letter belongs to one word. Grey tiles are empty.",
    ],
    controls: "Drag through letters, release to submit. Keys: arrows, space adds a letter, enter submits.",
    tiers: {
      easy: "4×4 grid, 3 common words",
      medium: "5×5 grid, 4 words",
      hard: "6×6 grid, 5 words up to 8 letters",
      expert: "6×6 grid, 5 longer, less common words, fewer empty tiles",
    },
    Example: WeaveExample,
  },
  recall: {
    steps: [
      "Colours flash on screen for a few seconds. Remember them and where they were.",
      "Then one position lights up. Rebuild that colour with the sliders.",
      "You score out of 10 for how close you got. Five rounds.",
    ],
    controls: "Drag the hue, vividness and brightness sliders, then lock in. Keys: arrows nudge a slider.",
    tiers: {
      easy: "1 colour, shown for 5 seconds",
      medium: "2 colours, shown for 4 seconds, rebuild 1",
      hard: "3 colours, shown for 3 seconds, rebuild 1",
      expert: "4 colours, shown for 3 seconds, rebuild 2",
    },
    Example: RecallExample,
  },
  chess: {
    steps: [
      "You play the side to move, from the bottom of the board. The last move is lit.",
      "Find the best move. If the line goes on, your opponent replies and you find the next one.",
      "One wrong move loses the puzzle. Solve fast for a speed bonus. Hints cut what you win.",
    ],
    controls: "Drag a piece, or tap it and then a square. Keys: arrows move, enter picks up and drops.",
    tiers: {
      easy: `puzzles about ${-PRACTICE_OFFSET.easy} below your rating`,
      medium: "puzzles at your rating",
      hard: `puzzles about ${PRACTICE_OFFSET.hard} above your rating`,
      expert: `puzzles about ${PRACTICE_OFFSET.expert} above. Expect to lose a few`,
    },
    Example: ChessExample,
  },
  trivia: {
    steps: [
      "Choose higher or lower, or a quiz category.",
      "Ten questions, each against a timer.",
      "Right answers score more the faster you are. Top score is 10.",
    ],
    controls: "Tap an answer. The bar shows how much time is left.",
    tiers: {
      easy: "20 seconds each, 3 options, numbers far apart",
      medium: "15 seconds each, 4 options",
      hard: "12 seconds each, numbers close together",
      expert: "8 seconds each, numbers almost equal",
    },
    Example: TriviaExample,
  },
};
