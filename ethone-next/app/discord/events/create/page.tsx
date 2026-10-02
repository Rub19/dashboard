import { Suspense } from "react";
import EventCreateClient from "./EventCreateClient";

export const dynamic = "force-static";

export default function EventCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-[var(--text-muted)]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
            <p className="text-xs text-[var(--text-muted)]">Chargement de l'assistant de création...</p>
          </div>
        </div>
      }
    >
      <EventCreateClient />
    </Suspense>
  );
}
