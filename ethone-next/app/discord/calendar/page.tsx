import { Suspense } from "react";
import DiscordCalendarClient from "./DiscordCalendarClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export default function CalendarPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement du Calendrier Discord…" />}
    >
      <DiscordCalendarClient />
    </Suspense>
  );
}
