import { Suspense } from "react";
import BotPresenceClient from "../BotPresenceClient";

export const metadata = {
  title: "Horaires & Profils Prédéfinis — Bot Presence 2.0 — ETHONE",
  description: "Planning automatique et profils 1-clic pour le bot Discord",
};

export const dynamic = "force-static";

export default function PresencePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090E]" />}>
      <BotPresenceClient initialTab="schedule" />
    </Suspense>
  );
}
