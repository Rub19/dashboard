import { Suspense } from "react";
import InvitesCenterClient from "./InvitesCenterClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export default function DiscordInvitesPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement d'Invite Tracker…" />}
    >
      <InvitesCenterClient />
    </Suspense>
  );
}
