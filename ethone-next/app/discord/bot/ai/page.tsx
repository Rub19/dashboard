import { Suspense } from "react";
import BotControlClient from "../BotControlClient";

export const metadata = {
  title: "Intelligence Artificielle — Bot Control Center 2.0 — ETHONE",
};

export const dynamic = "force-static";

export default function BotAiPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090E]" />}>
      <BotControlClient initialTab="ai" />
    </Suspense>
  );
}
