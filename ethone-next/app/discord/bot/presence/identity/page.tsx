import { Suspense } from "react";
import BotPresenceClient from "../BotPresenceClient";

export const metadata = {
  title: "Studio d'Identité — Bot Presence 2.0 — ETHONE",
  description: "Avatar, pseudonyme et gestion de l'identité visuelle du bot Discord",
};

export const dynamic = "force-static";

export default function PresencePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090E]" />}>
      <BotPresenceClient initialTab="identity" />
    </Suspense>
  );
}
