import { Suspense } from "react";
import PollsCenterClient from "./PollsCenterClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export default function PollsPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement de Polls & Voting…" />}
    >
      <PollsCenterClient />
    </Suspense>
  );
}
