import { Suspense } from "react";
import EventSettingsClient from "./EventSettingsClient";
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

export default function EventSettingsPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement des paramètres…" />}
    >
      <EventSettingsClient />
    </Suspense>
  );
}
