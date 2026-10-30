import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { StatsContent } from "@/components/StatsContent";

export const metadata: Metadata = { title: "stats", description: "Your ratings, bests, streaks and training days." };

export default function StatsPage() {
  return (
    <>
      <Header />
      <StatsContent />
    </>
  );
}
