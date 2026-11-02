"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { GameMeta } from "@/games/registry";
import { levelLabel, type GameSummary } from "@/engine/history";
import { dur, ease, parallax, press } from "@/lib/motion";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { GameIcon, hue } from "./GameIcon";
import { GameArt } from "./GameArt";

const MotionLink = motion.create(Link);

/**
 * A game card on the home grid (D-052). Hover lifts the card, springs the icon tile and pulls the
 * front mini board up with a soft glow in the game's hue. Press compresses it, which is the only
 * feedback a touch screen gets. On desktop the card art drifts a few pixels against the scroll.
 */
export function GameTile({ game, summary }: { game: GameMeta; summary: GameSummary | null }) {
  const played = summary && summary.played > 0;
  const ref = useRef<HTMLAnchorElement>(null);
  const reduced = useReducedMotion();
  const desktop = useMediaQuery("(min-width: 768px) and (pointer: fine)");

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const artY = useTransform(scrollYProgress, [0, 1], [parallax.cardArt, -parallax.cardArt]);

  return (
    <MotionLink
      ref={ref}
      href={`/play/${game.id}`}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap="press"
      variants={{ rest: { y: 0, scale: 1 }, hover: { y: -2, scale: 1 }, press: { y: 0, scale: press.card } }}
      transition={{ duration: dur.fast, ease: ease.spring }}
      className="surface group relative flex h-full min-h-[340px] flex-col overflow-hidden rounded-card transition-shadow duration-[var(--dur-base)] ease-[var(--ease-out)] hover:shadow-[var(--shadow-card-hover)]"
    >
      <div className="flex flex-col gap-4 p-6 pb-0 md:p-8 md:pb-0">
        <div className="flex items-center justify-between">
          <motion.span
            className="inline-flex"
            variants={{ rest: { rotate: 0, scale: 1 }, hover: { rotate: -8, scale: 1.08 }, press: { rotate: -4, scale: 1 } }}
            transition={{ duration: dur.slow, ease: ease.springStrong }}
          >
            <GameIcon id={game.id} size={44} />
          </motion.span>
          {summary && !played && <span className="rounded-full bg-paper px-2.5 py-0.5 font-mono text-caption font-medium text-void">new</span>}
          {played && (
            <span className="font-mono text-caption text-ash">
              {summary.rating} · {levelLabel(summary)}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="title-card">{game.name}</h3>
          <p className="text-fog">{game.tagline}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-paper px-4 font-mono text-body font-medium text-void transition-colors duration-[var(--dur-fast)] group-hover:bg-white">
            play {game.name}
            <span aria-hidden className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:translate-x-0.5">
              →
            </span>
          </span>
          <span className="text-caption text-steel">{game.skill}</span>
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
