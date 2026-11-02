/**
 * Card illustrations: two tilted mini boards per game that bleed off the bottom of the card,
 * the way Dialed stacks its game cards. The front board lifts and straightens on hover.
 * Pure SVG, coloured with the game's hue. Hover motion is transform only and switches off
 * under prefers-reduced-motion (global rule in globals.css).
 */
import type { ReactNode } from "react";
import type { GameId } from "@/games/registry";
import { hue } from "./GameIcon";
import { PieceAt } from "@/games/chess/pieces";

type Art = (v: 0 | 1, h: string) => ReactNode;

const cell = (x: number, y: number, s: number, fill: string, key: string | number, opacity = 1) => (
  <rect key={key} x={x + 1.5} y={y + 1.5} width={s - 3} height={s - 3} rx={s * 0.18} fill={fill} opacity={opacity} />
);
const grid = (n: number, fill = "#232323") =>
  Array.from({ length: n * n }, (_, i) => cell((i % n) * (100 / n), Math.floor(i / n) * (100 / n), 100 / n, fill, `g${i}`));

const ART: Record<GameId, Art> = {
  chess: (v, h) => {
    const s = 25;
    const last = v === 0 ? [9, 6] : [13, 10];
    return (
      <>
        {Array.from({ length: 16 }, (_, i) =>
          cell((i % 4) * s, Math.floor(i / 4) * s, s, (i % 4) % 2 === Math.floor(i / 4) % 2 ? "#3a3a3a" : "#202020", `s${i}`),
        )}
        {last.map((i) => cell((i % 4) * s, Math.floor(i / 4) * s, s, h, `l${i}`, 0.38))}
        {v === 0 ? (
          <>
            <PieceAt type="k" color="b" x={25} y={0} size={25} />
            <PieceAt type="p" color="b" x={0} y={25} size={25} />
            <PieceAt type="n" color="w" x={50} y={25} size={25} />
            <PieceAt type="q" color="w" x={75} y={75} size={25} />
            <path d="M87.5 75L87.5 47" stroke={h} strokeWidth={4} strokeLinecap="round" />
            <path d="M80 50L87.5 38L95 50Z" fill={h} />
          </>
        ) : (
          <>
            <PieceAt type="r" color="b" x={75} y={0} size={25} />
            <PieceAt type="k" color="w" x={0} y={75} size={25} />
            <PieceAt type="b" color="w" x={50} y={50} size={25} />
            <circle cx={37.5} cy={37.5} r={4} fill="#000" opacity={0.35} />
            <circle cx={12.5} cy={12.5} r={4} fill="#000" opacity={0.35} />
            <circle cx={87.5} cy={87.5} r={4} fill="#000" opacity={0.35} />
          </>
        )}
      </>
    );
  },
  path: (v, h) => {
    const n = 5;
    const s = 100 / n;
    const order = [0, 1, 2, 3, 4, 9, 8, 7, 6, 5, 10, 11, 12, 13, 14, 19, 18, 17, 16, 15, 20, 21, 22, 23, 24];
    const route = v === 0 ? order.slice(0, 19) : order.slice(0, 9);
    const c = (i: number) => `${(i % n) * s + s / 2},${Math.floor(i / n) * s + s / 2}`;
    const numbers: [number, number][] = [
      [0, 1],
      [7, 2],
      [13, 3],
      [24, 4],
    ];
    return (
      <>
        {grid(n)}
        {route.map((i) => cell((i % n) * s, Math.floor(i / n) * s, s, h, `w${i}`, 0.16))}
        <polyline points={route.map(c).join(" ")} fill="none" stroke={h} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        {numbers.map(([i, num]) => (
          <g key={i}>
            <circle cx={(i % n) * s + s / 2} cy={Math.floor(i / n) * s + s / 2} r={6.5} fill="#eeeeee" />
            <text x={(i % n) * s + s / 2} y={Math.floor(i / n) * s + s / 2 + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={7.5} fontWeight={700} fill="#000" fontFamily="var(--font-mono)">
              {num}
            </text>
          </g>
        ))}
      </>
    );
  },
  balance: (v, h) => {
    const n = 4;
    const s = 25;
    const board = v === 0 ? "drdrrdrddrdrrdrd" : "dr..r.d..d.r.r.d";
    return (
      <>
        {grid(n)}
        {[...board].map((ch, i) => {
          const x = (i % n) * s + s / 2;
          const y = Math.floor(i / n) * s + s / 2;
          if (ch === "d") return <circle key={i} cx={x} cy={y} r={6.5} fill={h} />;
          if (ch === "r") return <circle key={i} cx={x} cy={y} r={5.6} fill="none" stroke="#eeeeee" strokeWidth={2.4} />;
          return null;
        })}
        <text x={50} y={25} textAnchor="middle" dominantBaseline="central" fontSize={6} fill="#7e7e7e" fontFamily="var(--font-mono)">
          =
        </text>
      </>
    );
  },
  blocks: (v, h) => {
    const s = 20;
    const rects: [number, number, number, number, number][] =
      v === 0
        ? [
            [0, 0, 2, 3, 1],
            [2, 0, 3, 1, 0.55],
            [2, 1, 1, 2, 0.35],
            [3, 1, 2, 2, 0.8],
            [0, 3, 3, 2, 0.45],
            [3, 3, 2, 2, 0.65],
          ]
        : [
            [0, 0, 3, 2, 0.6],
            [3, 0, 2, 4, 1],
            [0, 2, 1, 3, 0.4],
          ];
    return (
      <>
        {grid(5)}
        {rects.map(([x, y, w, ht, o], i) => (
          <rect key={i} x={x * s + 2} y={y * s + 2} width={w * s - 4} height={ht * s - 4} rx={4} fill={h} opacity={o} />
        ))}
        {rects.map(([x, y, w, ht], i) => (
          <text key={`t${i}`} x={x * s + 8} y={y * s + 10} fontSize={7} fontWeight={700} fill="#000" fontFamily="var(--font-mono)">
            {w * ht}
          </text>
        ))}
      </>
    );
  },
  sudoku: (v, h) => {
    const digits = v === 0 ? "1234341221434321" : "1.3.3..2.1.4..2.";
    const s = 25;
    return (
      <>
        {grid(4)}
        {cell(1 * s, 2 * s, s, h, "hl")}
        <path d="M50 2v96M2 50h96" stroke="#3a3a3a" strokeWidth={1.5} />
        {[...digits].map((d, i) =>
          d === "." ? null : (
            <text
              key={i}
              x={(i % 4) * s + s / 2}
              y={Math.floor(i / 4) * s + s / 2 + 0.5}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fontWeight={i === 9 ? 700 : 500}
              fill={i === 9 ? "#000" : i % 3 === 0 ? "#eeeeee" : "#9ec1ff"}
              fontFamily="var(--font-mono)"
            >
              {d}
            </text>
          ),
        )}
      </>
    );
  },
  weave: (v, h) => {
    const letters = v === 0 ? "MINDLENBTROWSPEK" : "WORDSALTGRIDPLAY";
    const word = v === 0 ? [0, 1, 2, 3] : [0, 4, 5, 6];
    const s = 25;
    const c = (i: number) => `${(i % 4) * s + s / 2},${Math.floor(i / 4) * s + s / 2}`;
    return (
      <>
        {grid(4)}
        {word.map((i) => cell((i % 4) * s, Math.floor(i / 4) * s, s, h, `w${i}`))}
        <polyline points={word.map(c).join(" ")} fill="none" stroke="#000" strokeOpacity={0.25} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        {[...letters].map((l, i) => (
          <text
            key={i}
            x={(i % 4) * s + s / 2}
            y={Math.floor(i / 4) * s + s / 2 + 0.5}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={11}
            fontWeight={600}
            fill={word.includes(i) ? "#000" : "#d9d9d9"}
            fontFamily="var(--font-mono)"
          >
            {l}
          </text>
        ))}
      </>
    );
  },
  recall: (v) => {
    const swatches = v === 0 ? ["#e85d75", "#3fb8af", "#f2c14e", "#6a5acd"] : ["#2d9cdb", "#eb5757", "#27ae60", "#f2994a"];
    return (
      <>
        {swatches.map((c, i) => (
          <rect key={i} x={(i % 2) * 50 + 2} y={Math.floor(i / 2) * 40 + 2} width={46} height={36} rx={8} fill={c} />
        ))}
        <rect x={2} y={86} width={96} height={6} rx={3} fill="url(#hue-bar)" />
        <circle cx={v === 0 ? 62 : 30} cy={89} r={5.5} fill="#eeeeee" stroke="#000" strokeWidth={1.5} />
        <defs>
          <linearGradient id="hue-bar">
            {["#ff5f5f", "#ffcc33", "#4ade80", "#38bdf8", "#8585ff", "#ff5ca8"].map((c, i) => (
              <stop key={c} offset={`${i * 20}%`} stopColor={c} />
            ))}
          </linearGradient>
        </defs>
      </>
    );
  },
  trivia: (v, h) => (
    <>
      <rect x={2} y={2} width={96} height={44} rx={10} fill="#232323" />
      <rect x={2} y={54} width={96} height={44} rx={10} fill={h} />
      <text x={10} y={18} fontSize={8} fill="#7e7e7e" fontFamily="var(--font-mono)">
        {v === 0 ? "tokyo" : "canada"}
      </text>
      <text x={10} y={36} fontSize={14} fontWeight={600} fill="#eeeeee" fontFamily="var(--font-mono)">
        {v === 0 ? "37.4M" : "9.98M km²"}
      </text>
      <text x={10} y={70} fontSize={8} fill="#000" opacity={0.6} fontFamily="var(--font-mono)">
        {v === 0 ? "delhi" : "china"}
      </text>
      <text x={10} y={88} fontSize={14} fontWeight={700} fill="#000" fontFamily="var(--font-mono)">
        higher?
      </text>
      <path d="M84 66l6 8h-12z" fill="#000" />
      <path d="M84 90l6-8h-12z" fill="#000" opacity={0.4} />
    </>
  ),
};

function Panel({ id, v, className }: { id: GameId; v: 0 | 1; className: string }) {
  return (
    <div
      className={`absolute w-[168px] rounded-[22px] bg-[#151515] p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.55)] transition-transform duration-[var(--dur-slow)] ease-[var(--ease-spring)] ${className}`}
    >
      <svg viewBox="0 0 100 100" className="block h-auto w-full" aria-hidden>
        {ART[id](v, hue(id))}
      </svg>
    </div>
  );
}

/** Put inside a `group` element; the art fills its parent and is clipped by it. */
export function GameArt({ id, className = "" }: { id: GameId; className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none relative overflow-hidden ${className}`}>
      <Panel id={id} v={1} className="bottom-[-52px] left-1/2 -translate-x-[95%] -rotate-[9deg] opacity-60 group-hover:-translate-x-[105%] group-hover:-rotate-[13deg]" />
      <Panel id={id} v={0} className="bottom-[-64px] left-1/2 -translate-x-[30%] rotate-[6deg] group-hover:-translate-y-2 group-hover:rotate-[2deg]" />
    </div>
  );
}

/** One raised mini board panel at a given width, for the home hero's board field. */
export function BoardPanel({ id, v, width }: { id: GameId; v: 0 | 1; width: number }) {
  return (
    <div
      className="rounded-[22px] bg-[#151515] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_40px_rgba(0,0,0,0.6)]"
      style={{ width, padding: width * 0.07, borderRadius: width * 0.13 }}
    >
      <svg viewBox="0 0 100 100" className="block h-auto w-full" aria-hidden>
        {ART[id](v, hue(id))}
      </svg>
    </div>
  );
}

/** A single upright mini board, for the start card and stats. */
export function MiniBoard({ id, size = 96 }: { id: GameId; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      {ART[id](0, hue(id))}
    </svg>
  );
}
