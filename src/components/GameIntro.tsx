"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { GameMeta } from "@/games/registry";
import { INTRO } from "@/games/intro";
import type { Tier } from "@/engine/difficulty";
import type { Mode } from "@/engine/seed";
import { readJson, writeJson } from "@/engine/storage";
import { dur, ease } from "@/lib/motion";
import { Button } from "./Button";
import { useEffect, useState } from "react";
import { sendEvents } from "@/lib/analytics";
import { tutorial } from "@/lib/events";

const skipKey = (gameId: string) => `intro-skip:${gameId}`;

/** Whether the player chose to skip this game's intro. Read on the client only. */
export function introSkipped(gameId: string): boolean {
  return readJson<boolean>(skipKey(gameId), false);
}

interface GameIntroProps {
  game: GameMeta;
  tier: Tier;
  mode: Mode;
  /** Replaces the game's steps and the tier note, for a mode with its own rules (puzzle rush). */
  override?: { steps: readonly string[]; label: string; note: string };
  onStart: () => void;
  onBack: () => void;
}

/** How to play, shown between the start card and the board. */
export function GameIntroScreen({ game, tier, mode, override, onStart, onBack }: GameIntroProps) {
  const intro = INTRO[game.id];
  const steps = override?.steps ?? intro.steps;
  const [skip, setSkip] = useState(() => introSkipped(game.id));
  const Example = intro.Example;

  useEffect(() => {
    sendEvents(tutorial(game.id, "begin"));
  }, [game.id]);
  const start = () => {
    sendEvents(tutorial(game.id, "complete"));
    onStart();
  };

  const toggleSkip = () => {
    const next = !skip;
    setSkip(next);
    writeJson(skipKey(game.id), next);
  };

  return (
    <motion.div
      key="intro"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: dur.base, ease: ease.out }}
      className="flex flex-1 flex-col gap-5 p-6"
    >
      <div className="flex flex-col gap-1">
        <p className="text-caption uppercase text-steel">how to play</p>
        <h2 className="text-heading-lg font-medium">{game.name}</h2>
      </div>

      <div className="flex min-h-[132px] items-center justify-center rounded-control border border-iron bg-void p-4">
        <Example />
      </div>

      <ol className="flex flex-col gap-3">
        {steps.map((step, i) => (
          <motion.li
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur.base, ease: ease.out, delay: 0.08 + i * 0.06 }}
            className="flex gap-3"
          >
            <span className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-iron font-mono text-[11px] text-paper">
              {i + 1}
            </span>
            <span className="text-paper">{step}</span>
          </motion.li>
        ))}
      </ol>

      <div className="flex flex-col gap-1 rounded-control bg-graphite px-4 py-3">
        <span className="text-caption uppercase text-steel">
          {override?.label ?? `${tier} · ${mode}`}
        </span>
        <span className="text-fog">{override?.note ?? intro.tiers[tier]}</span>
      </div>

      <p className="text-[13px] leading-snug text-steel">{intro.controls}</p>
      {intro.credit && (
        <p className="text-caption text-steel">
          {intro.credit}{" "}
          <Link href="/credits" className="underline decoration-slate underline-offset-2 hover:text-fog">
            credits
          </Link>
        </p>
      )}

      <div className="mt-auto flex flex-col gap-3">
        <label className="flex cursor-pointer items-center gap-2 self-start text-caption text-fog">
          <input type="checkbox" checked={skip} onChange={toggleSkip} className="h-4 w-4 accent-[var(--color-ember)]" />
          skip this screen next time
        </label>
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <Button variant="ghost" arrow={false} onClick={onBack}>
            ←
          </Button>
          <Button onClick={start} className="w-full" autoFocus>
            start
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
