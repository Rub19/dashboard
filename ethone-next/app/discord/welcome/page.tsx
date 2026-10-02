import { Suspense } from "react";
import { WelcomeCenterClient } from "./WelcomeCenterClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export default function DiscordWelcomePage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement de Welcome & Onboarding…" />}
    >
      <WelcomeCenterClient />
    </Suspense>
  );
}
