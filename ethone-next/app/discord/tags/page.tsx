import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Tags | ETHONE",
  description: "Réponses réutilisables du serveur Discord : FAQ, formats, liens récurrents.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function TagsLegacyPage() {
  return <LegacyModuleRedirect module="tags" />;
}
