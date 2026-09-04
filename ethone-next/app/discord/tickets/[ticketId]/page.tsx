import { Suspense } from "react";
import TicketDetailClient from "./TicketDetailClient";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ ticketId: "1" }];
}

export default function TicketDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="text-xs text-zinc-400">Chargement du ticket...</p>
          </div>
        </div>
      }
    >
      <TicketDetailClient />
    </Suspense>
  );
}
