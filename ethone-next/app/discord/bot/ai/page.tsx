import { Suspense } from "react";
import BotControlClient from "../BotControlClient";

export const metadata = {
  title: "Intelligence Artificielle — Bot Control Center — ETHONE",
};

export const dynamic = "force-static";

export default function BotAiPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-main)]" />}>
      <BotControlClient initialTab="ai" />
    </Suspense>
  );
}
