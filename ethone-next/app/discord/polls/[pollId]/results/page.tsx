import { Suspense } from "react";
import PollResultsClient from "./PollResultsClient";
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

export default function PollResultsPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement des Résultats…" />}
    >
      <PollResultsClient />
    </Suspense>
  );
}
