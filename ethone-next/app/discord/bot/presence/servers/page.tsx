import { Suspense } from "react";
import BotPresenceClient from "../BotPresenceClient";

export const metadata = {
  title: "Préférences Serveurs — Bot Presence 2.0 — ETHONE",
  description: "Profils de présence préférés par serveur Discord installé",
};

export const dynamic = "force-static";

export default function PresencePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090E]" />}>
      <BotPresenceClient initialTab="servers" />
    </Suspense>
  );
}
