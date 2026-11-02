"use client";

/**
 * Hand-built SVG charts. One series per chart, coloured with the game's hue, labels in text tokens.
 * Specs: 2px lines, r>=4 end dots with a surface ring, hairline solid grid, hover tooltips.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { RatingPoint } from "@/engine/history";
import { TIER_THRESHOLD } from "@/engine/history";
import { TIERS } from "@/engine/difficulty";
import { motion } from "motion/react";
import { dur, ease } from "@/lib/motion";

const SURFACE = "#1a1a19";

// ---------------------------------------------------------------- sparkline

export function Sparkline({ points, color, width = 120, height = 32 }: { points: number[]; color: string; width?: number; height?: number }) {
  if (points.length < 2) return <div style={{ width, height }} className="flex items-center text-caption text-steel">no trend yet</div>;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(1, max - min);
  const x = (i: number) => 2 + (i / (points.length - 1)) * (width - 8);
  const y = (v: number) => 4 + (1 - (v - min) / span) * (height - 8);
  const d = points.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const last = points.length - 1;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(last)} cy={y(points[last])} r={4} fill={color} stroke={SURFACE} strokeWidth={2} />
    </svg>
  );
}

// ---------------------------------------------------------------- rating over time

const fmtDate = (at: number) => new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toLowerCase();

export function RatingChart({ series, color, label, tiers = true }: { series: RatingPoint[]; color: string; label: string; tiers?: boolean }) {
  // Draw at the real pixel width so text stays 11px on a phone instead of scaling down.
  const wrap = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 480 ? 200 : 240;
  const pad = { l: 44, r: 16, t: 16, b: 28 };
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId();

  const { min, max, ticks } = useMemo(() => {
    const vals = series.map((p) => p.rating);
    let lo = Math.min(...vals) - 40;
    let hi = Math.max(...vals) + 40;
    // Include the next threshold above, so you can see how far the next tier is.
    const above = tiers ? TIERS.map((t) => TIER_THRESHOLD[t]).find((v) => v > Math.max(...vals)) : undefined;
    if (above && above - hi < 200) hi = above + 20;
    lo = Math.floor(lo / 50) * 50;
    hi = Math.ceil(hi / 50) * 50;
    const step = hi - lo > 400 ? 200 : hi - lo > 200 ? 100 : 50;
    const t: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) t.push(v);
    return { min: lo, max: hi, ticks: t };
  }, [series, tiers]);

  const n = series.length;
  const x = (i: number) => pad.l + (n === 1 ? 0.5 : i / (n - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const d = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`).join("");
  const area = `${d}L${x(n - 1)},${H - pad.b}L${x(0)},${H - pad.b}Z`;
  // Puzzle ratings (chess) have no tiers, so no tier lines.
  const thresholds = tiers ? TIERS.slice(1).filter((t) => TIER_THRESHOLD[t] > min && TIER_THRESHOLD[t] < max) : [];

  function onMove(e: React.PointerEvent) {
    const box = ref.current?.getBoundingClientRect();
    if (!box || n < 2) return;
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  const h = hover !== null ? series[hover] : null;
  const last = series[n - 1];

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative" ref={wrap}>
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full touch-pan-y"
          role="img"
          aria-label={`${label} rating over ${n - 1} rated games, now ${last.rating}`}
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#262626" strokeWidth={1} />
              <text x={pad.l - 8} y={y(t)} textAnchor="end" dominantBaseline="central" fontSize={11} fill="#7e7e7e" fontFamily="var(--font-mono)">
                {t}
              </text>
            </g>
          ))}
          {thresholds.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(TIER_THRESHOLD[t])} y2={y(TIER_THRESHOLD[t])} stroke="#505050" strokeWidth={1} />
              <text x={W - pad.r} y={y(TIER_THRESHOLD[t]) - 6} textAnchor="end" fontSize={11} fill="#b4b4b4" fontFamily="var(--font-mono)">
                {t} at {TIER_THRESHOLD[t]}
              </text>
            </g>
          ))}
          {n > 1 && <path d={area} fill={`url(#${gid})`} />}
          {n > 1 && <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
          <circle cx={x(n - 1)} cy={y(last.rating)} r={5} fill={color} stroke={SURFACE} strokeWidth={2} />
          <text x={x(n - 1) - 10} y={y(last.rating) - 12} textAnchor="end" fontSize={12} fontWeight={600} fill="#eeeeee" fontFamily="var(--font-mono)">
            {last.rating}
          </text>
          <text x={pad.l} y={H - 8} fontSize={11} fill="#7e7e7e" fontFamily="var(--font-mono)">
            {series[0].at ? fmtDate(series[0].at) : "start"}
          </text>
          <text x={W - pad.r} y={H - 8} textAnchor="end" fontSize={11} fill="#7e7e7e" fontFamily="var(--font-mono)">
            {n - 1} rated games
          </text>
          {h && hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="#606060" strokeWidth={1} />
              <circle cx={x(hover)} cy={y(h.rating)} r={5} fill={color} stroke={SURFACE} strokeWidth={2} />
            </g>
          )}
        </svg>
        {h && hover !== null && (
          <div
            className="pointer-events-none absolute top-0 rounded-[10px] bg-paper px-2.5 py-1.5 font-mono text-caption text-void shadow-lg"
            style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > n / 2 ? "-110%" : "10%"})` }}
          >
            <span className="font-bold">{h.rating}</span> · {hover === 0 ? "start" : `game ${hover}`}
            {h.at ? ` · ${fmtDate(h.at)}` : ""}
          </div>
        )}
      </div>
    </figure>
  );
}

// ---------------------------------------------------------------- activity calendar

/** GitHub-style grid: columns are weeks (Monday first), cells are days, ember steps for 1, 2-3, 4+ games. */
export function ActivityCalendar({ days }: { days: { day: string; games: number }[] }) {
  const [hover, setHover] = useState<{ day: string; games: number } | null>(null);
  // Pad the start so the first column begins on a Monday.
  const first = new Date(`${days[0].day}T00:00:00Z`).getUTCDay();
  const lead = (first + 6) % 7;
  const cells = [...Array.from({ length: lead }, () => null), ...days];
  const weeks: ((typeof days)[number] | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const level = (g: number) => (g === 0 ? 0 : g === 1 ? 1 : g <= 3 ? 2 : 3);
  const fill = ["rgba(255,255,255,0.06)", "rgba(218,92,44,0.45)", "rgba(218,92,44,0.75)", "#da5c2c"];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-[3px]" role="img" aria-label={`Games played per day over the last ${days.length} days`} onPointerLeave={() => setHover(null)}>
        {weeks.map((w, i) => (
          <div key={i} className="flex flex-1 flex-col gap-[3px]">
            {Array.from({ length: 7 }, (_, j) => {
              const d = w[j];
              return d ? (
                <span
                  key={j}
                  onPointerEnter={() => setHover(d)}
                  className="aspect-square w-full rounded-[3px] transition-transform duration-[var(--dur-fast)] hover:scale-125"
                  style={{ background: fill[level(d.games)] }}
                />
              ) : (
                <span key={j} className="aspect-square w-full" />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-caption text-ash">
        <span className="font-mono">
          {hover
            ? `${new Date(`${hover.day}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).toLowerCase()} · ${hover.games} ${hover.games === 1 ? "game" : "games"}`
            : "hover a day"}
        </span>
        <span className="flex items-center gap-1.5">
          less
          {fill.map((f) => (
            <span key={f} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: f }} />
          ))}
          more
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- small bars

export function ActivityBars({ days, height = 40 }: { days: { day: string; games: number }[]; height?: number }) {
  const max = Math.max(1, ...days.map((d) => d.games));
  return (
    <div className="flex items-end gap-[3px]" style={{ height }} role="img" aria-label={`Games per day, last ${days.length} days`}>
      {days.map((d, i) => (
        <span
          key={d.day}
          title={`${d.day}: ${d.games}`}
          className="flex-1 origin-bottom rounded-t-[3px] rounded-b-[1px]"
          style={{
            height: `${Math.max(8, (d.games / max) * 100)}%`,
            background: d.games ? (i === days.length - 1 ? "#da5c2c" : "rgba(238,238,238,0.55)") : "rgba(255,255,255,0.07)",
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- tier progress

export function TierBar({ progress, color = "#eeeeee", from, delay = 0 }: { progress: number; color?: string; from?: number; delay?: number }) {
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
      <motion.span
        className="absolute inset-y-0 left-0 w-full origin-left rounded-full"
        style={{ background: color }}
        initial={{ scaleX: from ?? 0 }}
        animate={{ scaleX: progress }}
        transition={{ duration: dur.count, ease: ease.out, delay }}
      />
    </div>
  );
}
