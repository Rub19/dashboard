import { Suspense } from "react";
import BotControlClient from "./BotControlClient";
import BotControlErrorBoundary from "./BotControlErrorBoundary";

export const metadata = {
  title: "Bot Control Center — ETHONE",
  description: "Centre de contrôle, télémétrie et intelligence du bot Discord ETHONE",
};

export const dynamic = "force-static";

export default function BotControlPage() {
  return (
    <BotControlErrorBoundary>
      <Suspense fallback={<div className="min-h-full bg-[var(--bg-main)]" />}>
        <BotControlClient initialTab="overview" />
      </Suspense>
    </BotControlErrorBoundary>
  );
}
