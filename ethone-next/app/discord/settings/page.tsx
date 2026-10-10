import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Paramètres | ETHONE",
  description: "Langue, fuseau horaire, contacts d'urgence et commandes du bot sur votre serveur.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function SettingsLegacyPage() {
  return <LegacyModuleRedirect module="settings" />;
}
