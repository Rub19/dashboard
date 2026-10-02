import { Suspense } from "react";
import EventCreateClient from "./EventCreateClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export default function EventCreatePage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement de l'assistant de création…" />}
    >
      <EventCreateClient />
    </Suspense>
  );
}
