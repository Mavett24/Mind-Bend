"use client";

import Link from "next/link";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { GameMeta } from "@/games/registry";
import { levelLabel, type GameSummary } from "@/engine/history";
import { dur, ease, parallax, press } from "@/lib/motion";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { GameIcon, gameColours, hue } from "./GameIcon";
import { openCard } from "@/lib/cardOpen";
import { GameArt } from "./GameArt";

const MotionLink = motion.create(Link);

/**
 * A game card on the home grid (D-052, D-073). Filled with the game's deep colour, white text on
 * top. Hover lifts the card, springs the icon tile and pulls the front mini board up with a soft
 * glow in the game's hue. Press compresses it, which is the only feedback a touch screen gets.
 * Opening it grows the colour to the whole screen (cardOpen.ts). On desktop the card art drifts a
 * few pixels against the scroll.
 */
export function GameTile({ game, summary }: { game: GameMeta; summary: GameSummary | null }) {
  const played = summary && summary.played > 0;
  const ref = useRef<HTMLAnchorElement>(null);
  const reduced = useReducedMotion();
  const desktop = useMediaQuery("(min-width: 768px) and (pointer: fine)");
  const router = useRouter();
  const href = `/play/${game.id}`;

  function onOpen(e: React.MouseEvent<HTMLAnchorElement>) {
    // New tab, new window and reduced motion keep the plain link.
    if (reduced || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !ref.current) return;
    e.preventDefault();
    openCard(ref.current, game.id, () => router.push(href));
  }

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const artY = useTransform(scrollYProgress, [0, 1], [parallax.cardArt, -parallax.cardArt]);

  return (
    <MotionLink
      ref={ref}
      href={href}
      onClick={onOpen}
      style={gameColours(game.id)}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap="press"
      variants={{ rest: { y: 0, scale: 1 }, hover: { y: -2, scale: 1 }, press: { y: 0, scale: press.card } }}
      transition={{ duration: dur.fast, ease: ease.spring }}
      className="game-surface group relative flex h-full min-h-[340px] flex-col overflow-hidden rounded-card"
    >
      <div className="flex flex-col gap-4 p-6 pb-0 md:p-8 md:pb-0">
        <div className="flex items-center justify-between">
          <motion.span
            className="inline-flex"
            variants={{ rest: { rotate: 0, scale: 1 }, hover: { rotate: -8, scale: 1.08 }, press: { rotate: -4, scale: 1 } }}
            transition={{ duration: dur.slow, ease: ease.springStrong }}
          >
            {/* A dark ring keeps the bright tile apart from a colour close to its own. */}
            <span className="rounded-[13px] shadow-[0_0_0_1px_rgba(0,0,0,0.28),0_6px_16px_rgba(0,0,0,0.28)]">
              <GameIcon id={game.id} size={44} />
            </span>
          </motion.span>
          {summary && !played && (
            <span className="rounded-full bg-black/25 px-2.5 py-0.5 font-mono text-caption font-medium text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]">new</span>
          )}
          {played && (
            <span className="on-colour-soft font-mono text-caption">
              {summary.rating} · {levelLabel(summary)}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="title-card text-white">{game.name}</h3>
          <p className="on-colour-soft">{game.tagline}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-paper px-4 font-mono text-body font-medium text-void transition-colors duration-[var(--dur-fast)] group-hover:bg-white">
            play {game.name}
            <span aria-hidden className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:translate-x-0.5">
              →
            </span>
          </span>
          <span className="on-colour-soft text-caption">{game.skill}</span>
        </div>
      </div>
      <div className="relative mt-auto h-[172px]">
        {/* a soft glow in the game's hue rises behind the boards on hover (opacity only) */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-[15%] bottom-[-40%] top-[20%] rounded-full blur-3xl"
          style={{ background: hue(game.id) }}
          variants={{ rest: { opacity: 0 }, hover: { opacity: 0.18 }, press: { opacity: 0.12 } }}
          transition={{ duration: dur.slow, ease: ease.out }}
        />
        <GameArt id={game.id} className="h-full" y={desktop && !reduced ? artY : 0} />
      </div>
    </MotionLink>
  );
}
