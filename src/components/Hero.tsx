"use client";

/**
 * Home hero (D-042): a field of tilted mini boards from every game drifts behind a big mono
 * headline, follows the pointer with depth, and answers the daily set in front of it. Hovering
 * or focusing a game in the set pulls that game's boards forward; by default the next unplayed
 * game is the one lit up. Motion is transform and opacity only, and parallax and drift switch
 * off under prefers-reduced-motion.
 */
import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { GAMES, type GameId } from "@/games/registry";
import { dailyBoard, utcDateKey, utcIsoWeekday } from "@/engine/seed";
import { dailyTier, TIERS } from "@/engine/difficulty";
import type { Profile } from "@/lib/profile";
import { useToday } from "@/lib/useToday";
import { dur, ease } from "@/lib/motion";
import { GameIcon, hue } from "./GameIcon";
import { BoardPanel } from "./GameArt";

/* ---------- board field ---------- */

/** px a depth-1 board travels upward, on top of the page scroll, as the hero scrolls out */
const SCROLL_DRIFT = 140;

type Spot = {
  id: GameId;
  v: 0 | 1;
  /** left / top in % of the hero */
  x: number;
  y: number;
  w: number;
  r: number;
  /** parallax depth: higher moves more */
  d: number;
  /** also shown on small screens */
  m?: boolean;
};

const FIELD: Spot[] = [
  { id: "path", v: 0, x: 47, y: 2, w: 196, r: -8, d: 0.7, m: true },
  { id: "balance", v: 0, x: 80, y: 3, w: 176, r: 10, d: 1, m: true },
  { id: "blocks", v: 0, x: 62, y: 62, w: 196, r: 7, d: 0.85 },
  { id: "sudoku", v: 0, x: 89, y: 44, w: 168, r: -12, d: 1.25, m: true },
  { id: "weave", v: 0, x: 36, y: 72, w: 160, r: -5, d: 0.55 },
  { id: "recall", v: 0, x: 4, y: 78, w: 164, r: 9, d: 0.9 },
  { id: "trivia", v: 0, x: 86, y: 80, w: 156, r: 14, d: 1.15 },
  { id: "path", v: 1, x: -5, y: 6, w: 140, r: 12, d: 0.4, m: true },
  { id: "sudoku", v: 1, x: 24, y: -7, w: 128, r: -10, d: 0.3, m: true },
  { id: "weave", v: 1, x: 68, y: -9, w: 132, r: 6, d: 0.5, m: true },
  { id: "blocks", v: 1, x: 20, y: 90, w: 128, r: 12, d: 0.35 },
  { id: "balance", v: 1, x: 99, y: 22, w: 140, r: -6, d: 0.75 },
  { id: "trivia", v: 1, x: 52, y: 88, w: 124, r: 4, d: 0.3 },
  { id: "recall", v: 1, x: 60, y: 30, w: 118, r: -14, d: 0.25, m: true },
  { id: "chess", v: 0, x: 49, y: 58, w: 150, r: -7, d: 0.95 },
  { id: "chess", v: 1, x: 36, y: 6, w: 120, r: 11, d: 0.45, m: true },
];

function FieldBoard({
  spot,
  i,
  focus,
  mx,
  my,
  scroll,
}: {
  spot: Spot;
  i: number;
  focus: GameId | null;
  mx: MotionValue<number>;
  my: MotionValue<number>;
  /** 0 with the hero at the top of the page, 1 once it has scrolled out (0 under reduced motion) */
  scroll: MotionValue<number>;
}) {
  const x = useTransform(mx, (v) => v * spot.d * -28);
  // Pointer parallax plus scroll drift (D-052): deeper boards leave faster than the headline does.
  const y = useTransform(() => my.get() * spot.d * -20 - scroll.get() * spot.d * SCROLL_DRIFT);
  const active = focus === spot.id;
  const dim = focus !== null && !active;

  return (
    <motion.div
      className={`absolute ${spot.m ? "" : "max-md:hidden"}`}
      style={{
        left: `${spot.x}%`,
        top: `${spot.y}%`,
        x,
        y,
        zIndex: Math.round(spot.d * 10),
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: dur.slow * 1.6,
          ease: ease.spring,
          delay: 0.1 + i * 0.045,
        }}
        className="max-md:scale-[0.62] max-md:origin-top-left"
      >
        <div
          className="animate-[drift_var(--t)_ease-in-out_infinite]"
          style={
            {
              "--t": `${7 + (i % 5) * 1.3}s`,
              animationDelay: `${-i * 0.9}s`,
              rotate: `${spot.r}deg`,
            } as React.CSSProperties
          }
        >
          <div
            className="relative transition-[transform,opacity] duration-[var(--dur-slow)] ease-[var(--ease-spring)]"
            style={{
              opacity: active ? 1 : dim ? 0.22 : 0.5,
              transform: active ? "scale(1.1) translateY(-6px)" : "scale(1)",
            }}
          >
            <div
              aria-hidden
              className="absolute -inset-[18%] rounded-full blur-3xl transition-opacity duration-[var(--dur-slow)] ease-[var(--ease-out)]"
              style={{ background: hue(spot.id), opacity: active ? 0.28 : 0 }}
            />
            <div className="relative">
              <BoardPanel id={spot.id} v={spot.v} width={spot.w} />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- small pieces ---------- */

function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the clock must come from the client
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function untilMidnightUtc(now: Date): string {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const s = Math.max(0, Math.floor((next - now.getTime()) / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

function formatDay(date: Date): string {
  return date
    .toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    })
    .replace(",", "")
    .toLowerCase();
}

const DAY_LETTERS = ["m", "t", "w", "t", "f", "s", "s"];

/** The week's difficulty ramp: one bar per weekday, height by tier, today in ember. */
function WeekRamp({ today }: { today: Date | null }) {
  const wd = today ? utcIsoWeekday(today) : 0;
  return (
    <div className="flex items-end gap-4">
      <div className="flex items-end gap-1.5" aria-hidden>
        {DAY_LETTERS.map((l, i) => {
          const level = TIERS.indexOf(dailyTier(i + 1)) + 1;
          const isToday = wd === i + 1;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="flex h-8 w-3 items-end">
                <motion.span
                  className="block w-full origin-bottom rounded-[3px]"
                  style={{
                    height: `${level * 25}%`,
                    background: isToday ? "var(--color-ember)" : i + 1 < wd ? "var(--color-slate)" : "rgba(255,255,255,0.12)",
                  }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{
                    duration: dur.slow,
                    ease: ease.spring,
                    delay: 0.5 + i * 0.05,
                  }}
                />
              </div>
              <span className={`font-mono text-[11px] leading-none ${isToday ? "text-paper" : "text-steel"}`}>{l}</span>
            </div>
          );
        })}
      </div>
      <p className="pb-0.5 text-caption text-ash">
        easy monday,
        <br />
        expert sunday
      </p>
    </div>
  );
}

/* ---------- hero ---------- */

function headline(p: Profile | null, left: number): [string, string] {
  if (!p?.returning) return ["Eight games.", "Fresh daily."];
  const s = p.overall.streak;
  if (left === 0) return [s >= 2 ? `Day ${s}. Done.` : "Set cleared.", "Back at 00:00."];
  const rest = `${left} ${left === 1 ? "board" : "boards"} left.`;
  if (s >= 2) return [`Day ${s}.`, rest];
  return ["Welcome back.", rest];
}

export function Hero({ profile }: { profile: Profile | null }) {
  const today = useToday();
  const now = useNow();
  const reduce = useReducedMotion();
  const tier = today ? dailyBoard("path", today).tier : null;
  const todayKey = today ? utcDateKey(today) : null;
  const done = new Set(todayKey && profile ? GAMES.filter((g) => profile.games[g.id].dailyDone.has(todayKey)).map((g) => g.id) : []);
  const next = GAMES.find((g) => !done.has(g.id)) ?? null;
  const left = GAMES.length - done.size;

  const [hover, setHover] = useState<GameId | null>(null);
  const focus = hover ?? next?.id ?? null;

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 60, damping: 18, mass: 0.6 });
  const my = useSpring(rawY, { stiffness: 60, damping: 18, mass: 0.6 });
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const still = useMotionValue(0);
  const scroll = reduce ? still : scrollYProgress;
  // The field fades out as you leave the hero (opacity only, so it stays on under reduced motion).
  const fieldOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.15]);

  function onMove(e: PointerEvent<HTMLElement>) {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    rawX.set(((e.clientX - r.left) / r.width) * 2 - 1);
    rawY.set(((e.clientY - r.top) / r.height) * 2 - 1);
  }

  const [line1, line2] = headline(profile, left);

  return (
    <section
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={() => {
        rawX.set(0);
        rawY.set(0);
      }}
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden"
    >
      {/* the board field */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full max-md:h-[420px]">
        <motion.div className="absolute inset-0" style={{ opacity: fieldOpacity }}>
          {FIELD.map((spot, i) => (
            <FieldBoard key={`${spot.id}-${spot.v}`} spot={spot} i={i} focus={focus} mx={mx} my={my} scroll={scroll} />
          ))}
        </motion.div>
        {/* keep the headline readable and melt the field into the page */}
        <div className="absolute inset-0 z-20 bg-[radial-gradient(70%_75%_at_22%_48%,var(--color-void)_30%,transparent_75%)] max-md:bg-[radial-gradient(110%_55%_at_20%_95%,var(--color-void)_40%,transparent_85%)]" />
        <div className="absolute inset-x-0 bottom-0 z-20 h-40 bg-gradient-to-b from-transparent to-void" />
      </div>

      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-10 px-4 pb-16 pt-44 md:pt-36 lg:min-h-[min(820px,calc(100svh-56px))] lg:grid-cols-[1.25fr_1fr] lg:gap-16 lg:py-20">
        {/* left: the pitch */}
        <div className="flex flex-col gap-7">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur.slow, ease: ease.out }}
            className="flex items-center gap-2 text-caption text-steel"
          >
            ~/mind-bend $ daily {today ? `--${formatDay(today).replace(/ /g, "-")}` : ""}
            <span aria-hidden className="inline-block h-[1.1em] w-[0.5em] animate-blink bg-ember" />
          </motion.p>

          <h1 id="hero-title" className="font-medium">
            <motion.span
              key={line1}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: dur.slow * 1.4,
                ease: ease.springStrong,
                delay: 0.05,
              }}
              className="block whitespace-nowrap text-[clamp(44px,5.4vw,84px)] leading-[0.98] tracking-[-0.05em]"
            >
              {line1}
            </motion.span>
            <motion.span
              key={line2}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: dur.slow * 1.4,
                ease: ease.springStrong,
                delay: 0.14,
              }}
              className="block whitespace-nowrap text-[clamp(44px,5.4vw,84px)] leading-[0.98] tracking-[-0.05em] text-steel"
            >
              {line2}
            </motion.span>
          </h1>

          {!profile?.returning && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: dur.slow, ease: ease.out, delay: 0.3 }}
              className="max-w-md text-[15px] leading-relaxed text-fog"
            >
              Logic, memory and trivia, one board each, rebuilt every midnight. Play the set, then train any game on endless boards that
              learn your level.
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur.slow, ease: ease.out, delay: 0.35 }}
            className="flex flex-wrap items-center gap-3"
          >
            {next ? (
              <Link
                href={`/play/${next.id}?m=daily`}
                className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-paper pl-2 pr-5 font-mono text-[15px] font-medium text-void transition-[transform,background-color] duration-[var(--dur-fast)] ease-[var(--ease-spring)] hover:bg-white active:scale-[0.97]"
                onMouseEnter={() => setHover(next.id)}
                onMouseLeave={() => setHover(null)}
              >
                <GameIcon id={next.id} size={34} />
                {done.size === 0 ? `start with ${next.name}` : `continue with ${next.name}`}
                <span
                  aria-hidden
                  className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            ) : (
              <span className="inline-flex h-12 items-center rounded-full bg-white/[0.06] px-5 font-mono text-[15px] text-paper shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
                ✓ all eight done
              </span>
            )}
            <Link
              href="/#games"
              className="inline-flex h-12 items-center rounded-full bg-white/[0.06] px-5 font-mono text-[15px] text-paper shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-[transform,background-color] duration-[var(--dur-fast)] hover:bg-white/[0.1] active:scale-[0.97]"
            >
              practice
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: dur.slow, delay: 0.45 }} className="pt-2">
            <WeekRamp today={today} />
          </motion.div>
        </div>

        {/* right: the daily set */}
        <DailySet done={done} tier={tier} today={today} now={now} next={next?.id ?? null} onHover={setHover} />
      </div>
    </section>
  );
}

/* ---------- daily set ---------- */

function DailySet({
  done,
  tier,
  today,
  now,
  next,
  onHover,
}: {
  done: Set<GameId>;
  tier: string | null;
  today: Date | null;
  now: Date | null;
  next: GameId | null;
  onHover: (id: GameId | null) => void;
}) {
  return (
    <motion.section
      id="daily"
      aria-labelledby="daily-title"
      initial={{ opacity: 0, y: 28, rotate: 1.5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{
        duration: dur.slow * 1.5,
        ease: ease.springStrong,
        delay: 0.2,
      }}
      className="surface relative flex scroll-mt-20 flex-col gap-6 rounded-card p-6 md:p-7"
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="daily-title" className="flex items-center gap-2 text-caption uppercase tracking-wide text-ash">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ember" />
            daily set
          </h2>
          <p className="font-mono leading-none">
            <span className="text-number">{done.size}</span>
            <span className="text-number text-steel">/{GAMES.length}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 pt-0.5 text-right">
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 font-mono text-caption text-paper shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
            {tier ?? " "}
          </span>
          <span className="text-caption text-ash">{today ? formatDay(today) : " "}</span>
        </div>
      </div>

      <div className="flex gap-1" aria-hidden>
        {GAMES.map((g, i) => (
          <motion.span
            key={g.id}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{
              duration: dur.slow,
              ease: ease.spring,
              delay: 0.35 + i * 0.04,
            }}
            className="h-1.5 flex-1 origin-left rounded-full"
            style={{
              background: done.has(g.id) ? hue(g.id) : "rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </div>

      <ol className="-mx-2 flex flex-col">
        {GAMES.map((game, i) => {
          const isDone = done.has(game.id);
          const isNext = next === game.id;
          return (
            <motion.li
              key={game.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: dur.slow,
                ease: ease.out,
                delay: 0.3 + i * 0.04,
              }}
            >
              <Link
                href={`/play/${game.id}?m=daily`}
                onMouseEnter={() => onHover(game.id)}
                onFocus={() => onHover(game.id)}
                onBlur={() => onHover(null)}
                className="group flex h-12 items-center gap-3 rounded-control px-2 transition-colors duration-[var(--dur-fast)] hover:bg-white/[0.05] focus-visible:bg-white/[0.05]"
              >
                <span className="w-5 font-mono text-caption text-steel">{String(i + 1).padStart(2, "0")}</span>
                <span className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:scale-110 group-hover:-rotate-6">
                  <GameIcon id={game.id} size={28} />
                </span>
                <span className={`flex-1 font-mono ${isDone ? "text-ash line-through decoration-steel" : "text-paper"}`}>{game.name}</span>
                {isNext && <span className="font-mono text-caption text-fog max-sm:hidden">up next</span>}
                {isDone ? (
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-paper text-[11px] font-bold text-void"
                    aria-label="done today"
                  >
                    ✓
                  </span>
                ) : (
                  <span className="h-5 w-5 rounded-full shadow-[inset_0_0_0_1.5px_var(--color-slate)]" aria-label="not played today" />
                )}
                <span
                  aria-hidden
                  className="text-steel transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:translate-x-1 group-hover:text-paper"
                >
                  →
                </span>
              </Link>
            </motion.li>
          );
        })}
      </ol>

      <div className="flex items-center justify-between border-t border-white/[0.06] pt-4 text-caption">
        <span className="uppercase tracking-wide text-ash">new set in</span>
        <span className="font-mono text-[15px] text-paper" suppressHydrationWarning>
          {now ? untilMidnightUtc(now) : "--:--:--"}
        </span>
      </div>
    </motion.section>
  );
}
