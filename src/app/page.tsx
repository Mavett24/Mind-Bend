import { Header } from "@/components/Header";
import { HomeContent } from "@/components/HomeContent";

export default function Home() {
  return (
    <>
      <Header />
      <HomeContent />
      <footer className="border-t border-iron">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-6 text-caption text-steel sm:flex-row sm:justify-between">
          <span>mind_bend · v0.7</span>
          <span>Inspired by LinkedIn Games, Dialed and Lessgames. Everything here is original.</span>
        </div>
      </footer>
    </>
  );
}
