import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "credits",
  description: "Where Mind Bend's puzzles, questions, facts and word lists come from, and their licences.",
  alternates: { canonical: "/credits" },
};

const link = "text-paper underline decoration-slate underline-offset-4 hover:decoration-paper";

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className={link} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="title-card text-paper">{title}</h2>
      <div className="flex flex-col gap-3 text-fog">{children}</div>
    </section>
  );
}

/** Attribution the data licences ask for, in the app itself (THIRD_PARTY_NOTICES.md has the full list). */
export default function CreditsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-10 px-4 pb-16 pt-10 md:pt-14">
        <div className="flex flex-col gap-2">
          <h1 className="text-display font-mono font-medium text-paper">credits</h1>
          <p className="text-fog">
            Every logic board is generated here. The puzzles, questions, facts and words below come from open data, and this is where they are
            credited.
          </p>
        </div>

        <Section title="chess puzzles">
          <p>
            From the <Ext href="https://database.lichess.org/#puzzles">Lichess puzzle database</Ext>, released under{" "}
            <Ext href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</Ext>. Thanks to Lichess and its players.
          </p>
        </Section>

        <Section title="trivia questions">
          <p>
            Adapted from <Ext href="https://github.com/uberspot/OpenTriviaQA">OpenTriviaQA</Ext> by uberspot and contributors, under{" "}
            <Ext href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</Ext>. The questions were filtered, deduplicated and regrouped
            into categories, and the adapted set is shared under the same licence.
          </p>
        </Section>

        <Section title="higher or lower">
          <p>
            Population and GDP from the World Bank (<Ext href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</Ext>). Country names and
            areas from <Ext href="https://github.com/mledoze/countries">mledoze/countries</Ext>, available under the{" "}
            <Ext href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL</Ext>, so the combined data set is shared under the ODbL too. City
            populations from <Ext href="https://www.geonames.org/">GeoNames</Ext> (CC BY 4.0). Flags from{" "}
            <Ext href="https://github.com/lipis/flag-icons">flag-icons</Ext> by Panayiotis Lipiridis (MIT).
          </p>
        </Section>

        <Section title="weave words">
          <p>
            English word lists from <Ext href="http://wordlist.aspell.net/">SCOWL</Ext>, copyright Kevin Atkinson and contributors. Offensive
            words are filtered out with the <Ext href="https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words">LDNOOBW</Ext>{" "}
            list (CC BY 4.0).
          </p>
        </Section>

        <Section title="inspiration">
          <p>
            The game mechanics were inspired by LinkedIn&apos;s daily games, Dialed, Lessgames and chess.com puzzles. Mind Bend is independent and
            not affiliated with or endorsed by any of them. All names, visuals and code are original.
          </p>
        </Section>
      </main>
    </>
  );
}
