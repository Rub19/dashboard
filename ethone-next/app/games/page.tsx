import type { Metadata } from "next";
import { WORKER_URL } from "@/lib/api";

export const metadata: Metadata = {
  title: "Jeux — ETHONE OS",
  description: "Mini-jeux embarqués dans ETHONE OS.",
};

export const dynamic = "force-static";

export default function GamesPage() {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden p-2 sm:p-4">
      <iframe
        src={`${WORKER_URL}/api/games/dino`}
        title="Dino Corridor"
        className="h-full w-full flex-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-black"
        sandbox="allow-scripts allow-same-origin"
        loading="lazy"
      />
    </div>
  );
}
