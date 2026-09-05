import { Suspense } from "react";
import BotControlClient from "../BotControlClient";

export const metadata = {
  title: "Commandes du Bot — Bot Control Center 2.0 — ETHONE",
};

export const dynamic = "force-static";

export default function BotCommandsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090E]" />}>
      <BotControlClient initialTab="commands" />
    </Suspense>
  );
}
