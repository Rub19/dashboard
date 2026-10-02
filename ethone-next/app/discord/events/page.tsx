import { Suspense } from "react";
import EventsCenterClient from "./EventsCenterClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export default function EventsPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement de Events & Calendar…" />}
    >
      <EventsCenterClient />
    </Suspense>
  );
}
