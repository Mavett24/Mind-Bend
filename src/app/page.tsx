import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { HomeContent } from "@/components/HomeContent";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <>
      <Header />
      <HomeContent />
    </>
  );
}
