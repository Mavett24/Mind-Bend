import Link from "next/link";
import type { GameMeta } from "@/games/registry";
import { GameIcon } from "./GameIcon";

export function GameTile({ game }: { game: GameMeta }) {
  return (
    <Link
      href={`/play/${game.id}`}
      className="group flex min-h-[220px] flex-col gap-4 rounded-card border border-iron bg-carbon p-6 transition-colors duration-[var(--dur-base)] hover:border-slate hover:bg-graphite"
    >
      <div className="flex items-center justify-between">
        <GameIcon id={game.id} />
        {game.status === "building" && (
          <span className="text-caption uppercase tracking-wide text-steel">in build</span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-caption uppercase tracking-wide text-steel">{game.skill}</p>
        <h3 className="text-heading-lg font-bold">{game.name}</h3>
        <p className="text-fog">{game.tagline}</p>
      </div>
      <span className="mt-auto inline-flex items-center gap-2 text-paper underline decoration-slate underline-offset-4 group-hover:decoration-paper">
        play
        <span
          aria-hidden
          className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:translate-x-1"
        >
          →
        </span>
      </span>
    </Link>
  );
}
