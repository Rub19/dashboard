import { Suspense } from "react";
import { TicketCenterClient } from "./TicketCenterClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export default function DiscordTicketsPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement de Tickets Center…" />}
    >
      <TicketCenterClient />
    </Suspense>
  );
}
