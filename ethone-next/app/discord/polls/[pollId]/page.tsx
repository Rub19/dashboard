import { Suspense } from "react";
import PollDetailClient from "./PollDetailClient";
import PollCreateClient from "../create/PollCreateClient";
import ChildRouter from "@/components/discord/ChildRouter";
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

export default function PollDetailPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement du Sondage…" />}
    >
      <ChildRouter after="polls" routes={{ create: <PollCreateClient /> }}>
        <PollDetailClient />
      </ChildRouter>
    </Suspense>
  );
}
