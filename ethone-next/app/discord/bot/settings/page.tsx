import { Suspense } from "react";
import BotControlClient from "../BotControlClient";

export const metadata = {
  title: "Configuration Opérationnelle — Bot Control Center — ETHONE",
};

export const dynamic = "force-static";

export default function BotSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-main)]" />}>
      <BotControlClient initialTab="settings" />
    </Suspense>
  );
}
