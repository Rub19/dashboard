import { Suspense } from "react";
import BotControlClient from "../BotControlClient";

export const metadata = {
  title: "Modules du Bot — Bot Control Center — ETHONE",
};

export const dynamic = "force-static";

export default function BotModulesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-main)]" />}>
      <BotControlClient initialTab="modules" />
    </Suspense>
  );
}
