import { Suspense } from "react";
import BotPresenceClient from "./BotPresenceClient";

export const metadata = {
  title: "Présence & Activités du Bot — Mode Streamer, DND & Rotation — ETHONE",
  description: "Pilotage en temps réel du statut visible (En ligne, DND, Invisible), du mode streamer Twitch et de la rotation intelligente d'activités.",
};

export const dynamic = "force-static";

export default function PresencePage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-[var(--bg-main)]" />}>
      <BotPresenceClient initialTab="overview" />
    </Suspense>
  );
}
