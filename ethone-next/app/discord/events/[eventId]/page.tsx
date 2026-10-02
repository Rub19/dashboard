import { Suspense } from "react";
import EventDetailClient from "./EventDetailClient";
import EventCreateClient from "../create/EventCreateClient";
import ChildRouter from "@/components/discord/ChildRouter";
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

export default function EventDetailPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement de l'événement…" />}
    >
      <ChildRouter after="events" routes={{ create: <EventCreateClient /> }}>
        <EventDetailClient />
      </ChildRouter>
    </Suspense>
  );
}
