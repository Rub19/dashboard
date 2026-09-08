import { Suspense } from "react";
import BotControlClient from "../BotControlClient";

export const metadata = {
  title: "Tâches de Fond & Cron — Bot Control Center 2.0 — ETHONE",
};

export const dynamic = "force-static";

export default function BotJobsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-main)]" />}>
      <BotControlClient initialTab="jobs" />
    </Suspense>
  );
}
