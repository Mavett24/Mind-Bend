import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { GameStart } from "@/components/GameStart";
import { GAMES, getGame } from "@/games/registry";

export function generateStaticParams() {
  return GAMES.map((g) => ({ game: g.id }));
}

export async function generateMetadata({ params }: PageProps<"/play/[game]">): Promise<Metadata> {
  const game = getGame((await params).game);
  if (!game) return {};
  const title = `${game.name}: ${game.tagline}`;
  const description = `${game.rules} A new ${game.name} board every day, plus endless practice in four tiers. Free, no sign-up.`;
  const url = `/play/${game.id}`;
  // Link preview text (D-061). The image comes from ./opengraph-image.tsx.
  return {
    title: game.name,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: "Mind Bend", locale: "en", url, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PlayPage({ params }: PageProps<"/play/[game]">) {
  const game = getGame((await params).game);
  if (!game) notFound();

  return (
    <>
      <Header />
      <main className="flex flex-1 items-start justify-center px-4 py-6 md:items-center md:py-10">
        <Suspense fallback={<div className="min-h-[586px] w-full max-w-[440px] rounded-card border border-iron bg-carbon" />}>
          <GameStart game={game} />
        </Suspense>
      </main>
    </>
  );
}
