import { Suspense } from "react";
import { WelcomeCenterClient } from "./WelcomeCenterClient";

export const dynamic = "force-static";

export default function DiscordWelcomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-[var(--surface-raised)]/40 text-[var(--text-primary)]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            <p className="text-xs text-[var(--text-muted)]">Chargement de Welcome & Onboarding...</p>
          </div>
        </div>
      }
    >
      <WelcomeCenterClient />
    </Suspense>
  );
}
