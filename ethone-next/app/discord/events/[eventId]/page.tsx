import { Suspense } from "react";
import EventDetailClient from "./EventDetailClient";
import EventCreateClient from "../create/EventCreateClient";
import ChildRouter from "@/components/discord/ChildRouter";

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
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-[var(--text-muted)]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="text-xs text-[var(--text-muted)]">Chargement de l'événement...</p>
          </div>
        </div>
      }
    >
      <ChildRouter after="events" routes={{ create: <EventCreateClient /> }}>
        <EventDetailClient />
      </ChildRouter>
    </Suspense>
  );
}
