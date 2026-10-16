import { Suspense } from "react";
import SetupWizardClient from "./SetupWizardClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";
import { tx } from "@/lib/tx";

export const dynamic = "force-static";

export default function DiscordSetupPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label={tx("Chargement de la configuration guidée…")} />}
    >
      <SetupWizardClient />
    </Suspense>
  );
}
