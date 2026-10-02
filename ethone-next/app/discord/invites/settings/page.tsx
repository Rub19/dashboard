import { Suspense } from "react";
import InviteSettingsClient from "./InviteSettingsClient";
import ModuleSkeleton from "@/components/discord/ModuleSkeleton";

export const dynamic = "force-static";

export default function InviteSettingsPage() {
  return (
    <Suspense
      fallback={<ModuleSkeleton label="Chargement des paramètres d'invitations…" />}
    >
      <InviteSettingsClient />
    </Suspense>
  );
}
