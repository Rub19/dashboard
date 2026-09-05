import { Suspense } from "react";
import BotPresenceClient from "../BotPresenceClient";

export const metadata = {
  title: "Moteur de Rotation d'Activités — Bot Presence 2.0 — ETHONE",
  description: "Configuration de la rotation automatique des activités du bot Discord",
};

export const dynamic = "force-static";

export default function PresencePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090E]" />}>
      <BotPresenceClient initialTab="rotation" />
    </Suspense>
  );
}
