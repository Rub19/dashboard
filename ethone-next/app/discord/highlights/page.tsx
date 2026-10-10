import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Highlights | ETHONE",
  description: "Mots-clés surveillés : reçois un DM quand quelqu'un les mentionne dans le serveur.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function HighlightsLegacyPage() {
  return <LegacyModuleRedirect module="highlights" />;
}
