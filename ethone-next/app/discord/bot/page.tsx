import { Suspense } from "react";
import BotControlClient from "./BotControlClient";

export const metadata = {
  title: "Bot Control Center 2.0 — ETHONE",
  description: "Centre de contrôle, télémétrie et intelligence du bot Discord ETHONE",
};

export const dynamic = "force-static";

export default function BotControlPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-main)]" />}>
      <BotControlClient initialTab="overview" />
    </Suspense>
  );
}
