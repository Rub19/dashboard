import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Server Management Center — ETHONE",
  description: "Centre de gestion globale du serveur Discord",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function ServerLegacyPage() {
  return <LegacyModuleRedirect module="server" />;
}
