import { Suspense } from "react";
import BotPresenceClient from "./BotPresenceClient";

export const metadata = {
  title: "Bot Presence & Identity Center 2.0 — ETHONE",
  description: "Gestion globale du statut, des activités, de la rotation et de l'identité du bot Discord ETHONE",
};

export const dynamic = "force-static";

export default function PresencePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090E]" />}>
      <BotPresenceClient initialTab="overview" />
    </Suspense>
  );
}
