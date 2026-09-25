import { Suspense } from "react";
import PollDetailClient from "./PollDetailClient";
import PollCreateClient from "../create/PollCreateClient";
import ChildRouter from "@/components/discord/ChildRouter";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [
    { pollId: "community-game-night" },
    { pollId: "staff-decision-01" },
    { pollId: "feedback-event-01" },
    { pollId: "demo" },
  ];
}

export default function PollDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-[var(--bg-main)] text-white">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-xs text-zinc-400">Chargement du Sondage...</p>
          </div>
        </div>
      }
    >
      <ChildRouter after="polls" routes={{ create: <PollCreateClient /> }}>
        <PollDetailClient />
      </ChildRouter>
    </Suspense>
  );
}
