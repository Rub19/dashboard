import { Suspense } from "react";
import EconomyCenterClient from "./EconomyCenterClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export default function EconomyPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement de l'Économie…" />}
    >
      <EconomyCenterClient />
    </Suspense>
  );
}
