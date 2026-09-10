import { Suspense } from "react";
import BotControlClient from "../BotControlClient";

export const metadata = {
  title: "Télémétrie & Performances — Bot Control Center — ETHONE",
};

export const dynamic = "force-static";

export default function BotPerformancePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-main)]" />}>
      <BotControlClient initialTab="performance" />
    </Suspense>
  );
}
