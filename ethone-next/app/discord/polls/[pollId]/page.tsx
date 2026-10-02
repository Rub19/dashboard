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
        <div className="flex min-h-[50vh] items-center justify-center text-[var(--text-muted)]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
            <p className="text-xs text-[var(--text-muted)]">Chargement du Sondage...</p>
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
