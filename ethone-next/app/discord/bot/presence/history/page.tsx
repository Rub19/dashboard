import { Suspense } from "react";
import BotPresenceClient from "../BotPresenceClient";

export const metadata = {
  title: "Journal d'Audit — Bot Presence 2.0 — ETHONE",
  description: "Historique des changements de présence et traçabilité Gateway",
};

export const dynamic = "force-static";

export default function PresencePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090E]" />}>
      <BotPresenceClient initialTab="history" />
    </Suspense>
  );
}
