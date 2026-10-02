import { Suspense } from "react";
import TicketDetailClient from "./TicketDetailClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ ticketId: "1" }];
}

export default function TicketDetailPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement du ticket…" />}
    >
      <TicketDetailClient />
    </Suspense>
  );
}
