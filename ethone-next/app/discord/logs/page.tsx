import { Suspense } from "react";
import { AuditCenterClient } from "./AuditCenterClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export default function DiscordLogsPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement de l'Audit Center…" />}
    >
      <AuditCenterClient />
    </Suspense>
  );
}
