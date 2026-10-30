"use client";

import Link from "next/link";
import type { GameMeta } from "@/games/registry";
import type { GameSummary } from "@/engine/history";
import { suggestTier } from "@/engine/difficulty";
import { GameIcon } from "./GameIcon";
import { GameArt } from "./GameArt";

export function GameTile({ game, summary }: { game: GameMeta; summary: GameSummary | null }) {
  const played = summary && summary.played > 0;
  return (
    <Link
      href={`/play/${game.id}`}
      className="surface group relative flex h-full min-h-[340px] flex-col overflow-hidden rounded-card transition-[transform,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
    >
      <div className="flex flex-col gap-4 p-6 pb-0 md:p-8 md:pb-0">
        <div className="flex items-center justify-between">
          <GameIcon id={game.id} size={44} />
          {summary && !played && <span className="rounded-full bg-paper px-2.5 py-0.5 font-mono text-caption font-medium text-void">new</span>}
          {played && (
            <span className="font-mono text-caption text-ash">
              {summary.rating} · {suggestTier(summary.rating)}
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
      <GameArt id={game.id} className="mt-auto h-[172px]" />
    </Link>
  );
}
