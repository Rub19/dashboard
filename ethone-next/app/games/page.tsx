import type { Metadata } from "next";
import GameFrame from "@/components/games/GameFrame";

// This is a Server Component (it exports `metadata`, which Client Components
// can't do) — it must NOT import WORKER_URL from lib/api.ts ("use client").
// Doing so previously made Next.js serialize WORKER_URL as an unresolvable
// server->client reference, whose stringified error message ended up
// literally embedded in the iframe src, breaking the game entirely.
// process.env is safe to read directly here since this is a static export.
const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://raspy-fog-bf5b.rub19-mailpro.workers.dev";

export const metadata: Metadata = {
  title: "Jeux — ETHONE OS",
  description: "Mini-jeux embarqués dans ETHONE OS.",
};

export const dynamic = "force-static";

export default function GamesPage() {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden p-2 sm:p-4">
      <GameFrame src={`${WORKER_URL}/api/games/dino`} title="Dino Corridor" />
    </div>
  );
}
