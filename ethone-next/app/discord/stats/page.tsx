import LegacyModuleRedirect from "@/components/discord/LegacyModuleRedirect";

export const metadata = {
  title: "Statistiques | ETHONE",
  description: "Messages et vocal par jour, membres, salons et classements, avec graphiques.",
};

/** Ancienne adresse : le module s'ouvre maintenant dans la console. */
export default function StatsLegacyPage() {
  return <LegacyModuleRedirect module="stats" />;
}
