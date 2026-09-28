import { Suspense } from "react";
import { TicketCenterClient } from "./TicketCenterClient";

export const dynamic = "force-static";

export default function DiscordTicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-[var(--text-muted)]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="text-xs text-[var(--text-muted)]">Chargement de Tickets Center...</p>
          </div>
        </div>
      }
    >
      <TicketCenterClient />
    </Suspense>
  );
}
