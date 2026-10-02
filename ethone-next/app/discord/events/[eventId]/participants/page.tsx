import { Suspense } from "react";
import EventParticipantsClient from "./EventParticipantsClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [
    { eventId: "evt-gaming-night" },
    { eventId: "evt-rocket-tournament" },
    { eventId: "evt-staff-sync" },
    { eventId: "evt-watch-party" },
    { eventId: "demo" },
  ];
}

export default function EventParticipantsPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement des participants…" />}
    >
      <EventParticipantsClient />
    </Suspense>
  );
}
