import { Suspense } from "react";
import BotControlClient from "../BotControlClient";

export const metadata = {
  title: "Intégrations & Dépendances — Bot Control Center 2.0 — ETHONE",
};

export const dynamic = "force-static";

export default function BotIntegrationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-main)]" />}>
      <BotControlClient initialTab="integrations" />
    </Suspense>
  );
}
