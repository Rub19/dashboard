import { Suspense } from "react";
import BotControlClient from "../BotControlClient";

export const metadata = {
  title: "Commandes du Bot — Bot Control Center — ETHONE",
};

export const dynamic = "force-static";

export default function BotCommandsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-main)]" />}>
      <BotControlClient initialTab="commands" />
    </Suspense>
  );
}
