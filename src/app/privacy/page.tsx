import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "privacy",
  description: "What Mind Bend stores, what Google Analytics collects if you accept, and your rights.",
  alternates: { canonical: "/privacy" },
};

/** Contact for privacy questions and GDPR requests. */
const CONTACT = { label: "mmfavetta@gmail.com", href: "mailto:mmfavetta@gmail.com" };
const UPDATED = "17 November 2026";

const link = "text-paper underline decoration-slate underline-offset-4 hover:decoration-paper";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="title-card text-paper">{title}</h2>
      <div className="flex flex-col gap-3 text-fog">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-10 px-4 pb-16 pt-10 md:pt-14">
        <div className="flex flex-col gap-2">
          <p className="text-caption uppercase text-ash">last updated {UPDATED}</p>
          <h1 className="text-display font-mono font-medium text-paper">privacy</h1>
          <p className="text-fog">
            Short version: your games never leave your browser, and Google Analytics only runs if you click accept.
          </p>
        </div>

        <Section title="who runs this">
          <p>
            Mind Bend is a personal project by Matteo Favetta, based in The Hague, the Netherlands. He decides what is collected and why, which
            makes him the controller under the GDPR. Questions or requests:{" "}
            <a href={CONTACT.href} className={link}>
              {CONTACT.label}
            </a>
            .
          </p>
        </Section>

        <Section title="what stays on your device">
          <p>
            Your game history, ratings, streaks, settings and your cookie choice are saved in this browser&apos;s local storage. None of it is sent
            to a server. There are no accounts. A transfer code only leaves the browser if you copy it yourself.
          </p>
          <p>
            This storage is needed for the app to do what you came for, so it needs no consent. To delete it, use reset on the stats page or clear
            this site&apos;s data in your browser.
          </p>
        </Section>

        <Section title="google analytics, only if you accept">
          <p>
            If you accept, Google Analytics 4 measures how the site is used: pages visited, how you arrived, browser and device type, rough
            location (country and city, worked out from your IP address), and how the games are played: which game, tier and mode, how long a
            game took, whether it was solved, failed or left, hints used, your rating for that game, and when you open how to play or copy a
            challenge link. Never the boards themselves or the moves and answers you enter. It helps decide which games to improve. Nothing is
            collected before you accept, and the Google script isn&apos;t even loaded.
          </p>
          <p>
            Legal basis: your consent (GDPR article 6(1)(a) and article 11.7a of the Dutch Telecommunicatiewet). The settings used: no advertising,
            no Google signals, no data sharing with other Google products, no granular location or device data, and data kept for 14 months.
          </p>
          <div className="well overflow-x-auto rounded-control">
            <table className="w-full text-left text-body">
              <thead className="text-caption uppercase text-ash">
                <tr>
                  <th className="px-4 py-3 font-normal">cookie</th>
                  <th className="px-4 py-3 font-normal">purpose</th>
                  <th className="px-4 py-3 font-normal">lasts</th>
                </tr>
              </thead>
              <tbody className="text-fog">
                <tr className="border-t border-white/[0.06]">
                  <td className="px-4 py-3 font-mono text-paper">_ga</td>
                  <td className="px-4 py-3">Tells visits from different browsers apart with a random ID</td>
                  <td className="px-4 py-3 whitespace-nowrap">13 months</td>
                </tr>
                <tr className="border-t border-white/[0.06]">
                  <td className="px-4 py-3 font-mono text-paper">_ga_&lt;id&gt;</td>
                  <td className="px-4 py-3">Keeps track of the current session</td>
                  <td className="px-4 py-3 whitespace-nowrap">13 months</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Google processes this data for Mind Bend as a processor under its data processing terms. Google may handle it in the United States,
            which is covered by the EU-US Data Privacy Framework. See{" "}
            <a href="https://policies.google.com/technologies/partner-sites" className={link}>
              how Google uses data from sites that use its services
            </a>
            .
          </p>
        </Section>

        <Section title="hosting">
          <p>
            The site is hosted by Vercel Inc. (United States). Like any web server, Vercel processes technical request data such as your IP address
            to deliver pages and protect against abuse. This is needed to run the site (legitimate interest, GDPR article 6(1)(f)) and is covered
            by Vercel&apos;s data processing addendum.
          </p>
        </Section>

        <Section title="changing your mind">
          <p>
            Use <span className="text-paper">cookie settings</span> at the bottom of any page. If you reject after accepting, the Google Analytics
            cookies are deleted and the page reloads without the script. You are asked again after 12 months, or sooner if this page changes what
            is collected.
          </p>
        </Section>

        <Section title="your rights">
          <p>
            You can ask for access to, correction or deletion of your data, object to its use, or ask for it to be restricted. Analytics data is
            tied to a random cookie ID, not to your name, so include that ID (the value of the <span className="font-mono">_ga</span> cookie) if
            you want a request to reach it. You can also complain to the Dutch data protection authority, the{" "}
            <a href="https://www.autoriteitpersoonsgegevens.nl" className={link}>
              Autoriteit Persoonsgegevens
            </a>
            .
          </p>
          <p>Mind Bend is meant for people aged 16 and over. If you are younger, ask a parent before accepting analytics.</p>
        </Section>
      </main>
    </>
  );
}
