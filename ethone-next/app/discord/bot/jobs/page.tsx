import { Suspense } from "react";
import BotJobsClient from "./BotJobsClient";

export const metadata = {
  title: "Tâches de Fond & Cron — Bot Discord Etho — ETHONE",
  description: "Surveillance, files d'attente et ordonnanceur de tâches en arrière-plan du bot Discord Etho au format Keeper.",
};

export const dynamic = "force-static";

export default function BotJobsPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-[var(--bg-main)]" />}>
      <BotJobsClient />
    </Suspense>
  );
}
