import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Command Studio & Builder | ETHONE",
  description: "Créateur no-code de commandes Discord, embeds riches et simulateur live.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function CommandsLegacyPage() {
  return <LegacyModuleRedirect module="commands" />;
}
