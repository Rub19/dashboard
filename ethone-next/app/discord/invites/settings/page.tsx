import { Suspense } from "react";
import InviteSettingsClient from "./InviteSettingsClient";

export const dynamic = "force-static";

export default function InviteSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
            <p className="text-xs text-zinc-400">Chargement des paramètres d'invitations...</p>
          </div>
        </div>
      }
    >
      <InviteSettingsClient />
    </Suspense>
  );
}
