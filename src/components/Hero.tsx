"use client";

/**
 * Home hero (D-074): the headline on the left, today's set as a deck of game cards on the right
 * (above it on phones). The deck tilts toward the pointer, fans open as it moves, and spreads as the
 * hero scrolls away. The top card is today's next game; the deck switches through the set on its
 * own every few seconds, on a swipe, or from the segments under it, and tapping the top card opens
 * that game. Motion is transform and opacity only; under reduced motion the deck holds still and
 * cards swap without travel.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
  type PanInfo,
} from "motion/react";
import { GAMES, type GameId, type GameMeta } from "@/games/registry";
import { dailyBoard, utcDateKey } from "@/engine/seed";
import type { Profile } from "@/lib/profile";
import { useToday } from "@/lib/useToday";
import { untilMidnightUtc, useNow } from "@/lib/useNow";
import { dur, ease } from "@/lib/motion";
import { openCard } from "@/lib/cardOpen";
import { GameIcon, gameColours } from "./GameIcon";
import { MiniBoard } from "./GameArt";
import { HeroShader } from "./HeroShader";

const MotionLink = motion.create(Link);
const N = GAMES.length;

/** Seconds on each card before the deck moves on by itself. */
const AUTO_MS = 4800;
/** After you touch the deck, it waits this long before moving on by itself again. */
const IDLE_AFTER_TOUCH_MS = 9000;
/** A swipe past this distance, or this fast, switches cards (px, px/s). */
const SWIPE_PX = 64;
const SWIPE_VELOCITY = 450;

/** Where a card sits by its place in the deck (0 = top): fanned back to the left and down. */
const slot = (s: number) => ({ x: -s * 15, y: s * 9, rotate: -s * 2.1, scale: 1 - s * 0.018 });
/** Where the top card goes as it leaves: out to the left and up, tipping over. */
const OUT = { x: -260, y: -24, rotate: -16, scale: 0.96 };
/** Card motion: a quick, settled spring (no bounce, this is a deck of cards, not a toy). */
const DEAL = { type: "spring", duration: 0.55, bounce: 0.08 } as const;
const FLY = { type: "spring", duration: 0.34, bounce: 0 } as const;

function formatDay(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).replace(",", "").toLowerCase();
}

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
  const reduced = useReducedMotion();
  const tier = today ? dailyBoard("path", today).tier : null;
  const todayKey = today ? utcDateKey(today) : null;
  const done = new Set(todayKey && profile ? GAMES.filter((g) => profile.games[g.id].dailyDone.has(todayKey)).map((g) => g.id) : []);
  const next = GAMES.find((g) => !done.has(g.id)) ?? null;
  const left = N - done.size;
  const [line1, line2] = headline(profile, left);

  // Pointer across the hero, -1..1, on a soft spring. Mouse only.
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 70, damping: 20, mass: 0.7 });
  const my = useSpring(rawY, { stiffness: 70, damping: 20, mass: 0.7 });
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const still = useMotionValue(0);
  const scroll = reduced ? still : scrollYProgress;
  // The backdrop follows the card on top of the deck, and fades as the hero scrolls away (opacity only).
  const [topGame, setTopGame] = useState<GameId>(next?.id ?? "path");
  const deckRef = useRef<HTMLDivElement>(null);
  const backdropOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0]);

  function onMove(e: React.PointerEvent<HTMLElement>) {
    if (reduced || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    rawX.set(((e.clientX - r.left) / r.width) * 2 - 1);
    rawY.set(((e.clientY - r.top) / r.height) * 2 - 1);
  }

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
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(transparent,black_18%,black_72%,transparent)]"
        style={{ opacity: backdropOpacity }}
      >
        <HeroShader game={topGame} anchor={deckRef} mx={mx} my={my} reduced={!!reduced} />
      </motion.div>
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-6 px-4 pb-16 pt-6 md:px-8 lg:min-h-[min(820px,calc(100svh-56px))] lg:grid-cols-[1fr_540px] lg:gap-10 lg:py-16">
        {/* the pitch (below the deck on phones) */}
        <div className="order-2 flex flex-col gap-7 lg:order-1">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur.slow, ease: ease.out }}
            className="flex items-center gap-2 font-mono text-caption uppercase tracking-[0.12em] text-ash"
            suppressHydrationWarning
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ember" />
            {today ? `${formatDay(today)} · ${tier}` : " "}
          </motion.p>

          <h1 id="hero-title" className="!font-sans font-semibold">
            {[line1, line2].map((line, i) => (
              <motion.span
                key={`${i}-${line}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: dur.slow * 1.2, ease: ease.out, delay: 0.05 + i * 0.08 }}
                className={`block whitespace-nowrap text-[clamp(46px,6vw,84px)] leading-[0.98] tracking-[-0.045em] ${i ? "text-steel" : ""}`}
              >
                {line}
              </motion.span>
            ))}
          </h1>

          {!profile?.returning && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: dur.slow, ease: ease.out, delay: 0.25 }}
              className="max-w-[420px] text-[17px] leading-relaxed text-fog"
            >
              Logic, memory, trivia and chess. A new set at midnight, and endless boards that learn your level.
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur.slow, ease: ease.out, delay: 0.3 }}
            className="flex flex-wrap items-center gap-3"
          >
            {next ? (
              <Link
                href={`/play/${next.id}?m=daily`}
                className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-paper pl-2 pr-5 font-mono text-[15px] font-medium text-void transition-[transform,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-white active:scale-[0.97]"
              >
                <GameIcon id={next.id} size={34} />
                {done.size === 0 ? `start with ${next.name}` : `continue with ${next.name}`}
                <span aria-hidden className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:translate-x-1">
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
              className="inline-flex h-12 items-center rounded-full px-5 font-mono text-[15px] text-fog shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] transition-[transform,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:text-paper active:scale-[0.97]"
            >
              practice
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: dur.slow, delay: 0.4 }}
            className="font-mono text-caption text-ash"
            suppressHydrationWarning
          >
            <span className="text-paper">{done.size}</span> of {N} today · new set in{" "}
            <span className="tabular-nums text-fog">{now ? untilMidnightUtc(now) : "--:--:--"}</span>
          </motion.p>
        </div>

        <Deck done={done} next={next?.id ?? null} mx={mx} my={my} scroll={scroll} reduced={!!reduced} stageRef={deckRef} onTop={setTopGame} />
      </div>
    </section>
  );
}

/* ---------- the deck ---------- */

interface DeckProps {
  done: Set<GameId>;
  next: GameId | null;
  mx: MotionValue<number>;
  my: MotionValue<number>;
  scroll: MotionValue<number>;
  reduced: boolean;
  /** The deck's stage, for the backdrop to pool around. */
  stageRef: React.RefObject<HTMLDivElement | null>;
  /** Tells the backdrop which card is on top. */
  onTop: (id: GameId) => void;
}

function Deck({ done, next, mx, my, scroll, reduced, stageRef, onTop }: DeckProps) {
  const router = useRouter();
  const nextIndex = next ? GAMES.findIndex((g) => g.id === next) : 0;
  const [top, setTop] = useState(nextIndex);
  /** A card on its way out (dir 1: the top card leaving; dir -1: a back card coming round to the front). */
  const [moving, setMoving] = useState<{ index: number; dir: 1 | -1; to: number } | null>(null);
  const [dealt, setDealt] = useState(false);
  const lastTouch = useRef(0);
  const hovering = useRef(false);
  const [touched, setTouched] = useState(false);

  // Once history loads, open on today's next game (until you've touched the deck).
  const [syncedTo, setSyncedTo] = useState(nextIndex);
  if (syncedTo !== nextIndex && !touched && !moving) {
    setSyncedTo(nextIndex);
    setTop(nextIndex);
  }

  /** Bring card `to` to the top. Forward: the top card leaves to the back. Backward: `to` comes round from the back. */
  const go = useCallback(
    (to: number, dir: 1 | -1) => {
      if (moving || to === top) return;
      if (reduced) return setTop(to);
      setMoving(dir === 1 ? { index: top, dir, to } : { index: to, dir, to });
    },
    [moving, top, reduced],
  );
  const step = useCallback((dir: 1 | -1) => go((top + dir + N) % N, dir), [go, top]);
  // The backdrop starts shifting colour as soon as a card begins to leave, not when it lands.
  const showing = moving ? moving.to : top;
  useEffect(() => onTop(GAMES[showing].id), [showing, onTop]);
  const touch = useCallback(() => {
    lastTouch.current = performance.now();
    setTouched(true);
  }, []);

  // Moves on by itself: not while you're on it, not soon after you've used it, not in a hidden tab.
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      if (document.hidden || hovering.current || (lastTouch.current && performance.now() - lastTouch.current < IDLE_AFTER_TOUCH_MS)) return;
      step(1);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [reduced, step]);

  // Tilt toward the pointer; the whole deck rises a little as the hero scrolls away.
  const rotateY = useTransform(mx, (v) => v * 9 - 4);
  const rotateX = useTransform(my, (v) => v * -7 + 4);
  const deckY = useTransform(scroll, (v) => v * -60);

  const status = (id: GameId) => (done.has(id) ? "done today" : id === next ? "up next" : "in today's set");

  return (
    <section
      id="daily"
      aria-label="Today's set"
      className="order-1 flex scroll-mt-20 flex-col items-center gap-5 lg:order-2"
      onMouseEnter={() => (hovering.current = true)}
      onMouseLeave={() => (hovering.current = false)}
      onFocusCapture={() => (hovering.current = true)}
      onBlurCapture={() => (hovering.current = false)}
    >
      <div ref={stageRef} className="flex h-[360px] w-full items-center justify-center pl-12 pt-2 [perspective:1400px] sm:h-[420px] lg:h-[540px] lg:pl-20">
        <motion.div
          className="relative h-[270px] w-[204px] sm:h-[330px] sm:w-[248px] lg:h-[400px] lg:w-[300px]"
          style={{ rotateX, rotateY, y: deckY, transformStyle: "preserve-3d" }}
        >
          {GAMES.map((g, i) => {
            const s = (i - top + N) % N;
            const isMoving = moving?.index === i;
            return (
              <DeckCard
                key={g.id}
                game={g}
                s={s}
                // While a card flies out, it stays above the deck (leaving) or below it (coming round).
                z={isMoving ? (moving.dir === 1 ? N + 1 : 0) : N - s}
                out={isMoving}
                dealt={dealt}
                dealDelay={(N - 1 - s) * 0.045}
                status={status(g.id)}
                done={done.has(g.id)}
                mx={mx}
                scroll={scroll}
                reduced={reduced}
                onOut={() => {
                  if (!moving || moving.index !== i) return;
                  setTop(moving.to);
                  setMoving(null);
                }}
                onDealt={() => setDealt(true)}
                onSwipe={(dir) => {
                  touch();
                  step(dir);
                }}
                onOpen={(el) => {
                  touch();
                  if (s !== 0) return go(i, s <= N / 2 ? 1 : -1);
                  const href = done.has(g.id) ? `/play/${g.id}` : `/play/${g.id}?m=daily`;
                  if (reduced) return router.push(href);
                  openCard(el, g.id, () => router.push(href));
                }}
              />
            );
          })}
        </motion.div>
      </div>

      {/* the set: one segment per game, done in its colour, the card on top in white */}
      <div className="flex w-full max-w-[300px] flex-col lg:pl-20">
        <div className="grid grid-cols-8 gap-1">
          {GAMES.map((g, i) => (
            <button
              key={g.id}
              type="button"
              aria-label={`Show ${g.name}, ${status(g.id)}`}
              aria-current={i === top || undefined}
              onClick={() => {
                touch();
                const s = (i - top + N) % N;
                go(i, s <= N / 2 ? 1 : -1);
              }}
              className="group flex h-6 items-center"
            >
              <span
                className="relative h-1.5 w-full overflow-hidden rounded-full transition-transform duration-[var(--dur-fast)] ease-[var(--ease-out)] group-hover:scale-y-[1.6]"
                style={{ ...gameColours(g.id), background: done.has(g.id) ? "var(--deep)" : "var(--color-iron)" }}
              >
                <motion.span
                  className="absolute inset-0 rounded-full bg-paper"
                  initial={false}
                  animate={{ opacity: i === top ? 1 : 0, scaleX: i === top ? 1 : 0.4 }}
                  transition={{ duration: dur.base, ease: ease.out }}
                />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

interface DeckCardProps {
  game: GameMeta;
  /** Place in the deck, 0 on top. */
  s: number;
  z: number;
  out: boolean;
  dealt: boolean;
  dealDelay: number;
  status: string;
  done: boolean;
  mx: MotionValue<number>;
  scroll: MotionValue<number>;
  reduced: boolean;
  onOut: () => void;
  onDealt: () => void;
  onSwipe: (dir: 1 | -1) => void;
  onOpen: (el: HTMLElement) => void;
}

function DeckCard({ game, s, z, out, dealt, dealDelay, status, done, mx, scroll, reduced, onOut, onDealt, onSwipe, onOpen }: DeckCardProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const dragged = useRef(false);
  const isTop = s === 0 && !out;
  const depth = 1 - s / N;

  // Pointer and scroll on their own layer, so they never fight the deal and the swipe.
  // Moving right fans the deck open; scrolling spreads it, the top card leaving fastest.
  const px = useTransform(() => mx.get() * s * -6 + scroll.get() * s * -10);
  const py = useTransform(() => -scroll.get() * depth * 140);

  const target = out ? OUT : slot(s);

  return (
    <motion.div className="absolute inset-0" style={{ x: px, y: py, zIndex: z }}>
      <motion.div
        className="absolute inset-0"
        initial={reduced ? false : { opacity: 0, x: target.x, y: target.y + 60, rotate: target.rotate - 6, scale: target.scale }}
        animate={{ opacity: 1, ...target }}
        transition={reduced ? { duration: 0 } : out ? FLY : dealt ? DEAL : { ...DEAL, delay: dealDelay }}
        onAnimationComplete={() => {
          if (out) onOut();
          else if (!dealt && s === 0) onDealt();
        }}
      >
        <MotionLink
          ref={ref}
          href={done ? `/play/${game.id}` : `/play/${game.id}?m=daily`}
          tabIndex={isTop ? 0 : -1}
          aria-hidden={!isTop || undefined}
          aria-label={`${game.name}, ${status}. Open`}
          draggable={false}
          drag={isTop && !reduced ? "x" : false}
          dragSnapToOrigin
          dragElastic={0.5}
          dragTransition={{ bounceStiffness: 400, bounceDamping: 32 }}
          onDragStart={() => (dragged.current = true)}
          onDragEnd={(_: unknown, info: PanInfo) => {
            if (info.offset.x < -SWIPE_PX || info.velocity.x < -SWIPE_VELOCITY) onSwipe(1);
            else if (info.offset.x > SWIPE_PX || info.velocity.x > SWIPE_VELOCITY) onSwipe(-1);
            // Let the click that ends a drag pass without opening the card.
            window.setTimeout(() => (dragged.current = false), 0);
          }}
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            if (dragged.current || !ref.current) return;
            onOpen(ref.current);
          }}
          whileTap={isTop ? { scale: 0.98 } : undefined}
          style={gameColours(game.id)}
          className={`game-surface absolute inset-0 flex cursor-pointer touch-pan-y select-none flex-col overflow-hidden rounded-[22px] lg:rounded-[28px] ${
            isTop ? "" : "pointer-events-auto"
          }`}
        >
          <div className="flex items-start justify-between gap-3 p-4 lg:p-6">
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-mono text-[18px] font-medium leading-none tracking-[-0.03em] text-white lg:text-[24px]">{game.name}</span>
              <span className="on-colour-soft truncate text-caption">{game.skill}</span>
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-caption ${
                done ? "bg-black/25 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]" : "on-colour-soft"
              }`}
            >
              {done ? "done ✓" : status === "up next" ? "up next" : ""}
            </span>
          </div>
          <div className="mt-auto flex items-end justify-between p-4 pt-0 lg:p-6 lg:pt-0">
            <div className="w-[62%] rounded-[16px] bg-[#151515] p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_14px_30px_rgba(0,0,0,0.45)] lg:rounded-[20px] lg:p-2.5 [&>svg]:h-auto [&>svg]:w-full">
              <MiniBoard id={game.id} size={160} />
            </div>
            <span
              aria-hidden
              className={`flex h-9 w-9 items-center justify-center rounded-full bg-paper text-void transition-opacity duration-[var(--dur-base)] lg:h-11 lg:w-11 ${
                isTop ? "opacity-100" : "opacity-0"
              }`}
            >
              →
            </span>
          </div>
        </MotionLink>
      </motion.div>
    </motion.div>
  );
}
