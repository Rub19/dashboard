import { Suspense } from "react";
import BotCommandsClient from "./BotCommandsClient";

export const metadata = {
  title: "Catalogue des Commandes — Bot Discord Etho — ETHONE",
  description: "Catalogue officiel des commandes Slash et préfixes du bot Etho au format Keeper avec simulateur et motion design.",
};

export const dynamic = "force-static";

export default function BotCommandsPage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-[var(--bg-main)]" />}>
      <BotCommandsClient />
    </Suspense>
  );
}
