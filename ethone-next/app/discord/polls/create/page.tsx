import { Suspense } from "react";
import PollCreateClient from "./PollCreateClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export default function PollCreatePage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement du Créateur de Sondage…" />}
    >
      <PollCreateClient />
    </Suspense>
  );
}
