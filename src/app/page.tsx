import { Header } from "@/components/Header";
import { DailyCard } from "@/components/DailyCard";
import { GameTile } from "@/components/GameTile";
import { GAMES } from "@/games/registry";

export default function Home() {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-10 px-4 pb-16 pt-10 md:gap-16 md:pt-16">
        <section className="flex flex-col gap-4">
          <p className="text-caption text-steel">~/mind-bend $ train</p>
          <h1 className="max-w-3xl text-display font-bold md:text-[48px] md:leading-[1.1] md:tracking-[-0.03em]">
            Train the way you think.
            <br />
            <span className="text-ash">Never the same board twice.</span>
          </h1>
          <p className="max-w-xl text-fog">
            Six games for logic, memory and knowledge. Every board is generated and checked for a single solution. A
            daily set for everyone, infinite practice for you, and difficulty that follows your skill.
          </p>
        </section>

        <DailyCard />

        <section id="games" aria-labelledby="games-title" className="flex flex-col gap-6">
          <div className="flex items-baseline justify-between">
            <h2 id="games-title" className="text-heading font-bold">
              games
            </h2>
            <p className="text-caption uppercase tracking-wide text-steel">{GAMES.length} games · 4 tiers</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GAMES.map((game) => (
              <GameTile key={game.id} game={game} />
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-iron">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-6 text-caption text-steel sm:flex-row sm:justify-between">
          <span>mind_bend · v0.1</span>
          <span>Inspired by LinkedIn Games, Dialed and Lessgames. Everything here is original.</span>
        </div>
      </footer>
    </>
  );
}
