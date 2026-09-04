import { Suspense } from "react";
import { WelcomeCenterClient } from "./WelcomeCenterClient";

export const dynamic = "force-static";

export default function DiscordWelcomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            <p className="text-xs text-zinc-400">Chargement de Welcome & Onboarding 2.0...</p>
          </div>
        </div>
      }
    >
      <WelcomeCenterClient />
    </Suspense>
  );
}
