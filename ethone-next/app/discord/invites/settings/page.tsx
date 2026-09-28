import { Suspense } from "react";
import InviteSettingsClient from "./InviteSettingsClient";

export const dynamic = "force-static";

export default function InviteSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-[var(--surface-raised)]/40 text-[var(--text-primary)]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
            <p className="text-xs text-[var(--text-muted)]">Chargement des paramètres d'invitations...</p>
          </div>
        </div>
      }
    >
      <InviteSettingsClient />
    </Suspense>
  );
}
