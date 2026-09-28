import { Suspense } from "react";
import PollsCenterClient from "./PollsCenterClient";

export const dynamic = "force-static";

export default function PollsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-[var(--bg-main)] text-white">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="text-xs text-[var(--text-muted)]">Chargement de Polls & Voting...</p>
          </div>
        </div>
      }
    >
      <PollsCenterClient />
    </Suspense>
  );
}
