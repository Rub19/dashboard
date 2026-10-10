import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Rôles & Hiérarchie — Server Management Center — ETHONE",
};

export const dynamic = "force-static";

/** Ancien onglet de la gestion du serveur : le module Serveur s'ouvre maintenant dans la console. */
export default function ServerLegacyPage() {
  return <LegacyModuleRedirect module="server" />;
}
