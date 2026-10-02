import { Suspense } from "react";
import PollVoteClient from "./PollVoteClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [
    { pollId: "community-game-night" },
    { pollId: "staff-decision-01" },
    { pollId: "feedback-event-01" },
    { pollId: "demo" },
  ];
}

export default function PollVotePage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement du Portail de Vote…" />}
    >
      <PollVoteClient />
    </Suspense>
  );
}
