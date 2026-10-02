import { Suspense } from "react";
import PollSettingsClient from "./PollSettingsClient";
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

export default function PollSettingsPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement des Paramètres…" />}
    >
      <PollSettingsClient />
    </Suspense>
  );
}
