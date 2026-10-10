import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Boîte à Suggestions | ETHONE",
  description: "Idées communautaires, votes interactifs et Kanban de réponse staff.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function SuggestionsLegacyPage() {
  return <LegacyModuleRedirect module="suggestions" />;
}
