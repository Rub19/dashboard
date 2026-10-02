import { Suspense } from "react";
import SetupWizardClient from "./SetupWizardClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export default function DiscordSetupPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement de la configuration guidée…" />}
    >
      <SetupWizardClient />
    </Suspense>
  );
}
