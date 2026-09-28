import { Suspense } from "react";
import { AuditCenterClient } from "./AuditCenterClient";

export const dynamic = "force-static";

export default function DiscordLogsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-[var(--surface-raised)] text-[var(--text-primary)]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-transparent" />
            <p className="text-xs text-[var(--text-muted)]">Chargement de l&apos;Audit Center...</p>
          </div>
        </div>
      }
    >
      <AuditCenterClient />
    </Suspense>
  );
}
